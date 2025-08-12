package com.deepforestpoc.ar

import android.content.ContentValues
import android.content.Context
import android.hardware.display.DisplayManager
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import android.util.Log
import android.view.Surface
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.ar.core.RecordingConfig
import com.google.ar.core.RecordingStatus
import com.google.ar.core.Session
import com.google.ar.core.exceptions.CameraNotAvailableException
import com.google.ar.core.exceptions.RecordingFailedException
import java.io.File

class ArRecordingModule(private val reactContext: ReactApplicationContext)
  : ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "ArRecording"

  private fun currentSession(): Session? = ArSessionHolder.session
  private fun recStatus(): RecordingStatus? = currentSession()?.recordingStatus
  private var lastUri: Uri? = null

  private fun sendEvent(name: String, params: WritableMap? = null) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(name, params)
  }

  @ReactMethod
  fun isSessionReady(promise: Promise) {
    promise.resolve(currentSession() != null)
  }

  @ReactMethod
  fun getRecordingStatus(promise: Promise) {
    promise.resolve(recStatus()?.name ?: "UNKNOWN")
  }

  private fun makeOutputUri(outputPathOrEmpty: String?): Uri {
    if (!outputPathOrEmpty.isNullOrBlank()) {
      return if (outputPathOrEmpty.startsWith("content://") || outputPathOrEmpty.startsWith("file://"))
        Uri.parse(outputPathOrEmpty)
      else Uri.fromFile(File(outputPathOrEmpty))
    }
    val resolver = reactContext.contentResolver
    val values = ContentValues().apply {
      put(MediaStore.Video.Media.MIME_TYPE, "video/mp4")
      put(MediaStore.Video.Media.DISPLAY_NAME, "ar_recording_${System.currentTimeMillis()}.mp4")
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        put(MediaStore.Video.Media.RELATIVE_PATH, "Movies/Deepforest")
      }
    }
    return resolver.insert(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, values)
      ?: Uri.fromFile(File(reactContext.cacheDir, "ar_recording_${System.currentTimeMillis()}.mp4"))
  }

  private fun getRotationDegrees(): Int {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      val dm = reactContext.getSystemService(Context.DISPLAY_SERVICE) as DisplayManager
      val rotation = dm.getDisplay(android.view.Display.DEFAULT_DISPLAY)?.rotation ?: Surface.ROTATION_0
      when (rotation) {
        Surface.ROTATION_0 -> 0
        Surface.ROTATION_90 -> 90
        Surface.ROTATION_180 -> 180
        Surface.ROTATION_270 -> 270
        else -> 0
      }
    } else {
      @Suppress("DEPRECATION")
      when (reactContext.currentActivity?.windowManager?.defaultDisplay?.rotation ?: Surface.ROTATION_0) {
        Surface.ROTATION_0 -> 0
        Surface.ROTATION_90 -> 90
        Surface.ROTATION_180 -> 180
        Surface.ROTATION_270 -> 270
        else -> 0
      }
    }
  }

  @ReactMethod
  fun startRecording(outputPath: String?, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      try {
        val session = currentSession()
          ?: return@runOnUiThread promise.reject("NO_SESSION", "AR Session not ready")

        if (recStatus() == RecordingStatus.OK) {
          promise.resolve(null)
          return@runOnUiThread
        }

        val uri = makeOutputUri(outputPath)
        val rotationDegrees = getRotationDegrees()

        val cfg = RecordingConfig(session)
          .setMp4DatasetUri(uri)
          .setAutoStopOnPause(true)
          .setRecordingRotation(rotationDegrees)

        Log.d("ArRecording", "startRecording uri=$uri rotation=$rotationDegrees")
        try {
          session.startRecording(cfg)
        } catch (e: CameraNotAvailableException) {
          sendEvent("ArRecording_onError", Arguments.createMap().apply {
            putString("code", "CAMERA_UNAVAILABLE"); putString("message", e.message)
          })
          return@runOnUiThread promise.reject("CAMERA_UNAVAILABLE", e)
        } catch (e: SecurityException) {
          sendEvent("ArRecording_onError", Arguments.createMap().apply {
            putString("code", "NO_CAMERA_PERMISSION"); putString("message", e.message)
          })
          return@runOnUiThread promise.reject("NO_CAMERA_PERMISSION", e)
        } catch (e: RecordingFailedException) {
          sendEvent("ArRecording_onError", Arguments.createMap().apply {
            putString("code", "ARCORE_RECORD_START_FAILED"); putString("message", e.message)
          })
          return@runOnUiThread promise.reject("ARCORE_RECORD_START_FAILED", e)
        } catch (e: Exception) {
          sendEvent("ArRecording_onError", Arguments.createMap().apply {
            putString("code", "ARCORE_RECORD_START_FAILED"); putString("message", e.message)
          })
          return@runOnUiThread promise.reject("ARCORE_RECORD_START_FAILED", e)
        }

        lastUri = uri
        val payload = Arguments.createMap().apply {
          putString("uri", uri.toString())
          putInt("rotation", rotationDegrees)
        }
        sendEvent("ArRecording_onStarted", payload)
        Log.d("ArRecording", "Recording started")
        promise.resolve(uri.toString())
      } catch (e: Exception) {
        sendEvent("ArRecording_onError", Arguments.createMap().apply {
          putString("code", "ARCORE_RECORD_START_FAILED"); putString("message", e.message)
        })
        promise.reject("ARCORE_RECORD_START_FAILED", e)
      }
    }
  }

  @ReactMethod
  fun stopRecording(promise: Promise) {
    UiThreadUtil.runOnUiThread {
      try {
        val session = currentSession()
          ?: return@runOnUiThread promise.reject("NO_SESSION", "AR Session not ready")

        val status = recStatus()
        if (status != RecordingStatus.OK) {
          sendEvent("ArRecording_onStopped", null)
          promise.resolve(null)
          return@runOnUiThread
        }

        try {
          session.stopRecording()
        } catch (e: RecordingFailedException) {
          sendEvent("ArRecording_onError", Arguments.createMap().apply {
            putString("code", "ARCORE_RECORD_STOP_FAILED"); putString("message", e.message)
          })
          return@runOnUiThread promise.reject("ARCORE_RECORD_STOP_FAILED", e)
        } catch (e: Exception) {
          sendEvent("ArRecording_onError", Arguments.createMap().apply {
            putString("code", "ARCORE_RECORD_STOP_FAILED"); putString("message", e.message)
          })
          return@runOnUiThread promise.reject("ARCORE_RECORD_STOP_FAILED", e)
        }

        sendEvent("ArRecording_onStopped", null)
        Log.d("ArRecording", "Recording stopped")

        val u = lastUri
        if (u != null) {
          val retriever = MediaMetadataRetriever()
          try {
            retriever.setDataSource(reactContext, u)
            val rot = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION)?.toIntOrNull() ?: -1
            val w = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)?.toIntOrNull() ?: -1
            val h = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)?.toIntOrNull() ?: -1
            val info = Arguments.createMap().apply {
              putString("uri", u.toString())
              putInt("rotationMeta", rot)
              putInt("width", w)
              putInt("height", h)
            }
            sendEvent("ArRecording_onFileInfo", info)
            Log.d("ArRecording", "FileInfo rotationMeta=$rot width=$w height=$h")
          } catch (e: Exception) {
            Log.w("ArRecording", "Meta probe failed: ${e.message}")
          } finally {
            retriever.release()
          }
        }

        promise.resolve(null)
      } catch (e: Exception) {
        sendEvent("ArRecording_onError", Arguments.createMap().apply {
          putString("code", "ARCORE_RECORD_STOP_FAILED"); putString("message", e.message)
        })
        promise.reject("ARCORE_RECORD_STOP_FAILED", e)
      }
    }
  }
}
