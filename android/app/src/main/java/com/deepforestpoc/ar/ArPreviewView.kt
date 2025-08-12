package com.deepforestpoc.ar

import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.ViewTreeObserver
import android.widget.FrameLayout
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.uimanager.ThemedReactContext
import com.google.ar.core.Config
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
        frameEventsEnabled = enabled
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
