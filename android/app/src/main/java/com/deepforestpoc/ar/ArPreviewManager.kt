package com.deepforestpoc.ar

import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class ArPreviewManager : SimpleViewManager<ArPreviewView>() {
    override fun getName() = "ArPreview"
    override fun createViewInstance(reactContext: ThemedReactContext) = ArPreviewView(reactContext)

    @ReactProp(name = "depthEnabled")
    fun setDepthEnabled(view: ArPreviewView, enabled: Boolean) {
        view.setDepthEnabled(enabled)
    }

    @ReactProp(name = "planeDetection")
    fun setPlaneDetection(view: ArPreviewView, mode: String?) {
        view.setPlaneDetection(mode)
    }

    @ReactProp(name = "frameEventsEnabled")
    fun setFrameEventsEnabled(view: ArPreviewView, enabled: Boolean) {
        view.setFrameEventsEnabled(enabled)
    }
}
