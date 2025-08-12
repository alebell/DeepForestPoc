package com.deepforestpoc.ar

import androidx.annotation.MainThread
import com.google.ar.core.Session
import java.lang.ref.WeakReference

object ArSessionHolder {
  @Volatile
  private var sessionRef: WeakReference<Session>? = null

  @Volatile
  private var ownerId: Int? = null

  var session: Session?
    get() = get()
    set(value) = set(value, owner = null)

  fun isReady(): Boolean = get() != null

  fun get(): Session? = sessionRef?.get()

  @Synchronized
  fun set(value: Session?, owner: Any? = null) {
    sessionRef = if (value != null) WeakReference(value) else null
    ownerId = owner?.hashCode()
  }

  @Synchronized
  fun clear() {
    sessionRef = null
    ownerId = null
  }

  @Synchronized
  fun clearIfOwner(owner: Any?): Boolean {
    val ok = ownerId != null && ownerId == owner?.hashCode()
    if (ok) {
      sessionRef = null
      ownerId = null
    }
    return ok
  }
}
