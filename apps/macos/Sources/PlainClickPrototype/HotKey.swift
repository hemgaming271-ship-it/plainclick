import Carbon

/// Global shortcut via Carbon `RegisterEventHotKey`. It is still the supported way to register a system-wide hotkey
/// and, unlike a global NSEvent key monitor, needs no Input Monitoring / Accessibility permission.
/// Several instances can coexist: each handler only consumes events carrying its own hotkey ID.
final class HotKey {
    private static var nextID: UInt32 = 1
    private var hotKeyRef: EventHotKeyRef?
    private var handlerRef: EventHandlerRef?
    private let id: UInt32
    private let callback: () -> Void

    init?(keyCode: UInt32, modifiers: UInt32, callback: @escaping () -> Void) {
        self.callback = callback
        id = HotKey.nextID
        HotKey.nextID += 1
        var spec = EventTypeSpec(eventClass: OSType(kEventClassKeyboard), eventKind: UInt32(kEventHotKeyPressed))
        let userData = Unmanaged.passUnretained(self).toOpaque()
        let installStatus = InstallEventHandler(GetApplicationEventTarget(), { _, event, userData in
            guard let userData, let event else { return OSStatus(eventNotHandledErr) }
            var pressed = EventHotKeyID()
            let status = GetEventParameter(event, EventParamName(kEventParamDirectObject), EventParamType(typeEventHotKeyID),
                                           nil, MemoryLayout<EventHotKeyID>.size, nil, &pressed)
            let me = Unmanaged<HotKey>.fromOpaque(userData).takeUnretainedValue()
            guard status == noErr, pressed.signature == HotKey.signature, pressed.id == me.id else {
                return OSStatus(eventNotHandledErr)
            }
            me.callback()
            return noErr
        }, 1, &spec, userData, &handlerRef)
        guard installStatus == noErr else { return nil }

        let hotKeyID = EventHotKeyID(signature: HotKey.signature, id: id)
        let regStatus = RegisterEventHotKey(keyCode, modifiers, hotKeyID, GetApplicationEventTarget(), 0, &hotKeyRef)
        guard regStatus == noErr else { return nil } // deinit removes the installed handler
    }

    private static let signature = OSType(0x504C_434B) // 'PLCK'

    deinit {
        if let hotKeyRef { UnregisterEventHotKey(hotKeyRef) }
        if let handlerRef { RemoveEventHandler(handlerRef) }
    }
}
