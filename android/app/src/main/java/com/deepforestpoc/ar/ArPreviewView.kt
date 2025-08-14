package com.deepforestpoc.ar

import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.ViewTreeObserver
import android.widget.FrameLayout
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.uimanager.ThemedReactContext
import com.google.ar.core.Config
import com.google.ar.core.LightEstimate
import com.google.ar.core.Plane
import com.google.ar.core.PointCloud
import io.github.sceneview.ar.ARSceneView

class ArPreviewView(
    private val themedContext: ThemedReactContext
) : FrameLayout(themedContext), LifecycleEventListener {

    private val sceneView: ARSceneView = ARSceneView(themedContext)
    private val handler = Handler(Looper.getMainLooper())
    private var sentReady = false
    private var frameEventsEnabled: Boolean = false

    private val readyProbe = object : Runnable {
        override fun run() {
            val s = sceneView.session
            if (!sentReady && s != null) {
                ArSessionHolder.set(s, this@ArPreviewView)
                sendEvent("ArSessionReady", null)
                Log.d("ArPreviewView", "ArSessionReady emitted (probe)")
                sentReady = true
                return
            }
            handler.postDelayed(this, 200)
        }
    }

    private val frameEventRunnable = object : Runnable {
        override fun run() {
            if (!frameEventsEnabled) {
                return
            }
            val session = sceneView.session
            if (session != null) {
                try {
                    val frame = session.update()
                    val eventMap: WritableMap = Arguments.createMap()
                    eventMap.putDouble("timestamp", frame.timestamp.toDouble())
                    val camera = frame.camera
                    val pose = camera.displayOrientedPose
                    val trans = pose.translation
                    val transArr: WritableArray = Arguments.createArray()
                    transArr.pushDouble(trans[0].toDouble())
                    transArr.pushDouble(trans[1].toDouble())
                    transArr.pushDouble(trans[2].toDouble())
                    eventMap.putArray("translation", transArr)
                    val quat = pose.rotationQuaternion
                    val rotArr: WritableArray = Arguments.createArray()
                    rotArr.pushDouble(quat[0].toDouble())
                    rotArr.pushDouble(quat[1].toDouble())
                    rotArr.pushDouble(quat[2].toDouble())
                    rotArr.pushDouble(quat[3].toDouble())
                    eventMap.putArray("rotationQuat", rotArr)
                    val intrinsics = camera.textureIntrinsics
                    if (intrinsics != null) {
                        val intrinsicsMap: WritableMap = Arguments.createMap()
                        val focal = intrinsics.focalLength
                        intrinsicsMap.putDouble("fx", focal[0].toDouble())
                        intrinsicsMap.putDouble("fy", focal[1].toDouble())
                        val principal = intrinsics.principalPoint
                        intrinsicsMap.putDouble("cx", principal[0].toDouble())
                        intrinsicsMap.putDouble("cy", principal[1].toDouble())
                        val dims = intrinsics.imageDimensions
                        intrinsicsMap.putInt("width", dims[0])
                        intrinsicsMap.putInt("height", dims[1])
                        eventMap.putMap("intrinsics", intrinsicsMap)
                    }
                    val viewMat = FloatArray(16)
                    camera.getViewMatrix(viewMat, 0)
                    val viewArr: WritableArray = Arguments.createArray()
                    for (v in viewMat) {
                        viewArr.pushDouble(v.toDouble())
                    }
                    eventMap.putArray("viewMatrix", viewArr)
                    val projMat = FloatArray(16)
                    camera.getProjectionMatrix(projMat, 0, 0.1f, 100.0f)
                    val projArr: WritableArray = Arguments.createArray()
                    for (v in projMat) {
                        projArr.pushDouble(v.toDouble())
                    }
                    eventMap.putArray("projectionMatrix", projArr)
                    val light = frame.lightEstimate
                    val lightMap: WritableMap = Arguments.createMap()
                    lightMap.putString("state", light.state.toString())
                    if (light.state == LightEstimate.State.VALID) {
                        lightMap.putDouble("pixelIntensity", light.pixelIntensity.toDouble())
                        val colorCorrection = FloatArray(4)
                        light.getColorCorrection(colorCorrection, 0)
                        val colArr: WritableArray = Arguments.createArray()
                        for (c in colorCorrection) {
                            colArr.pushDouble(c.toDouble())
                        }
                        lightMap.putArray("colorCorrection", colArr)
                    }
                    eventMap.putMap("lightEstimate", lightMap)
                    eventMap.putString("cameraTrackingState", camera.trackingState.toString())
                    val failure = camera.trackingFailureReason
                    if (failure != null) {
                        eventMap.putString("cameraTrackingFailureReason", failure.toString())
                    }
                    val planes = frame.getUpdatedTrackables(Plane::class.java)
                    val planesArr: WritableArray = Arguments.createArray()
                    for (plane in planes) {
                        val planeMap: WritableMap = Arguments.createMap()
                        planeMap.putString("trackingState", plane.trackingState.toString())
                        planeMap.putString("planeType", plane.type.toString())
                        planeMap.putDouble("extentX", plane.extentX.toDouble())
                        planeMap.putDouble("extentZ", plane.extentZ.toDouble())
                        val centerPose = plane.centerPose
                        val ct = centerPose.translation
                        val ctArr: WritableArray = Arguments.createArray()
                        ctArr.pushDouble(ct[0].toDouble())
                        ctArr.pushDouble(ct[1].toDouble())
                        ctArr.pushDouble(ct[2].toDouble())
                        planeMap.putArray("centerTranslation", ctArr)
                        val cq = centerPose.rotationQuaternion
                        val cqArr: WritableArray = Arguments.createArray()
                        cqArr.pushDouble(cq[0].toDouble())
                        cqArr.pushDouble(cq[1].toDouble())
                        cqArr.pushDouble(cq[2].toDouble())
                        cqArr.pushDouble(cq[3].toDouble())
                        planeMap.putArray("centerRotation", cqArr)
                        planesArr.pushMap(planeMap)
                    }
                    eventMap.putArray("planes", planesArr)
                    val pc: PointCloud = frame.acquirePointCloud()
                    try {
                        val pcArr: WritableArray = Arguments.createArray()
                        val buf = pc.points
                        buf.rewind()
                        while (buf.remaining() >= 4) {
                            val x = buf.get()
                            val y = buf.get()
                            val z = buf.get()
                            val conf = buf.get()
                            val ptArr: WritableArray = Arguments.createArray()
                            ptArr.pushDouble(x.toDouble())
                            ptArr.pushDouble(y.toDouble())
                            ptArr.pushDouble(z.toDouble())
                            ptArr.pushDouble(conf.toDouble())
                            pcArr.pushArray(ptArr)
                        }
                        eventMap.putArray("pointCloud", pcArr)
                    } finally {
                        pc.release()
                    }
                    sendEvent("ArFrameEvent", eventMap)
                } catch (e: Exception) {
                    Log.e("ArPreviewView", "Error capturing AR frame event", e)
                }
            }
            handler.postDelayed(this, 33)
        }
    }

    init {
        addView(sceneView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
        themedContext.addLifecycleEventListener(this)
        viewTreeObserver.addOnGlobalLayoutListener(object : ViewTreeObserver.OnGlobalLayoutListener {
            override fun onGlobalLayout() {
                Log.d("ArPreviewView", "layout w=${width} h=${height}")
            }
        })
        sceneView.lifecycle?.addObserver(
            object : DefaultLifecycleObserver {
                override fun onResume(owner: LifecycleOwner) {
                    val s = sceneView.session
                    Log.d("ArPreviewView", "lifecycle.onResume; session=${s != null}")
                    if (s != null && !sentReady) {
                        ArSessionHolder.set(s, this@ArPreviewView)
                        sendEvent("ArSessionReady", null)
                        Log.d("ArPreviewView", "ArSessionReady emitted (onResume)")
                        sentReady = true
                    }
                }
                override fun onPause(owner: LifecycleOwner) {
                    Log.d("ArPreviewView", "lifecycle.onPause")
                }
            }
        )
        handler.post(readyProbe)
    }

    private fun sendEvent(name: String, params: Any?) {
        (themedContext as ReactContext)
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(name, params)
    }

    fun setDepthEnabled(enabled: Boolean) {
        sceneView.configureSession { session, config ->
            config.depthMode =
                if (session.isDepthModeSupported(Config.DepthMode.AUTOMATIC) && enabled) {
                    Config.DepthMode.AUTOMATIC
                } else {
                    Config.DepthMode.DISABLED
                }
        }
    }

    fun setPlaneDetection(mode: String?) {
        sceneView.configureSession { _, config ->
            config.planeFindingMode =
                when (mode) {
                    "horizontal" -> Config.PlaneFindingMode.HORIZONTAL
                    "vertical" -> Config.PlaneFindingMode.VERTICAL
                    "both" -> Config.PlaneFindingMode.HORIZONTAL_AND_VERTICAL
                    else -> Config.PlaneFindingMode.DISABLED
                }
        }
    }

    fun setFrameEventsEnabled(enabled: Boolean) {
        val wasEnabled = frameEventsEnabled
        frameEventsEnabled = enabled
        if (enabled && !wasEnabled) {
            handler.post(frameEventRunnable)
        } else if (!enabled && wasEnabled) {
            handler.removeCallbacks(frameEventRunnable)
        }
    }

    override fun onHostResume() {
        Log.d("ArPreviewView", "host.onResume")
    }

    override fun onHostPause() {
        Log.d("ArPreviewView", "host.onPause")
    }

    override fun onHostDestroy() {
        Log.d("ArPreviewView", "host.onDestroy")
        handler.removeCallbacksAndMessages(null)
        sceneView.destroy()
        ArSessionHolder.clearIfOwner(this)
    }

    override fun onDetachedFromWindow() {
        Log.d("ArPreviewView", "onDetachedFromWindow")
        themedContext.removeLifecycleEventListener(this)
        handler.removeCallbacksAndMessages(null)
        super.onDetachedFromWindow()
    }
}
