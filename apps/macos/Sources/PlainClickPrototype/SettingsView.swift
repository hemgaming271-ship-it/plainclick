import PlainClickCore
import SwiftUI

struct SettingsView: View {
    @ObservedObject var settings: AppSettings
    @ObservedObject var licence: LicenceManager
    var initialTab: Tab = .apps
    @State private var tab: Tab = .apps

    enum Tab: Hashable { case apps, appearance, licence, guide }

    var body: some View {
        TabView(selection: $tab) {
            AppsTab(settings: settings).tabItem { Text("Apps") }.tag(Tab.apps)
            AppearanceTab(settings: settings).tabItem { Text("Panel") }.tag(Tab.appearance)
            LicenceTab(licence: licence).tabItem { Text("Licence") }.tag(Tab.licence)
            GuideTab().tabItem { Text("Free guide") }.tag(Tab.guide)
        }
        .padding(20)
        .frame(width: 520, height: 440)
        .onAppear { tab = initialTab }
    }
}

private struct AppsTab: View {
    @ObservedObject var settings: AppSettings

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Text("PlainClick only works with these apps and actions. Other apps show a \"not supported\" message.")
                    .foregroundStyle(.secondary)
                ForEach(ActionCatalog.adapters, id: \.bundleID) { adapter in
                    VStack(alignment: .leading, spacing: 6) {
                        Toggle(isOn: Binding(get: { settings.isEnabled(adapter.bundleID) },
                                             set: { settings.setEnabled(adapter.bundleID, $0) })) {
                            Text(adapter.displayName).font(.headline)
                        }
                        Text("Pinned actions, in panel order:").font(.callout).foregroundStyle(.secondary)
                        ForEach(settings.visibleActions(for: adapter)) { action in
                            HStack {
                                Text(action.label)
                                Spacer()
                                Button("Move up") { settings.move(action, in: adapter, by: -1) }
                                    .accessibilityLabel("Move \(action.label) up")
                                Button("Move down") { settings.move(action, in: adapter, by: 1) }
                                    .accessibilityLabel("Move \(action.label) down")
                                Button("Unpin") { settings.togglePin(action, in: adapter) }
                                    .accessibilityLabel("Unpin \(action.label)")
                            }
                        }
                        let unpinned = adapter.supportedActions.filter { !settings.isPinned($0, in: adapter) }
                        if !unpinned.isEmpty {
                            HStack {
                                Text("Available:").foregroundStyle(.secondary)
                                ForEach(unpinned) { action in
                                    Button("Pin \(action.label)") { settings.togglePin(action, in: adapter) }
                                }
                            }
                        }
                    }
                    Divider()
                }
                Text("Actions are listed as tested only after they pass repeated tests on a stated macOS version. See the compatibility page on the website.")
                    .font(.caption).foregroundStyle(.secondary)
            }
        }
    }
}

private struct AppearanceTab: View {
    @ObservedObject var settings: AppSettings

    var body: some View {
        Form {
            Picker("Appearance", selection: $settings.appearance) {
                ForEach(AppSettings.Appearance.allCases) { Text($0.label).tag($0) }
            }
            Picker("Layout", selection: $settings.comfortable) {
                Text("Comfortable").tag(true)
                Text("Compact").tag(false)
            }
            Toggle("Show icons next to labels", isOn: $settings.showIcons)
            Text("Shortcut: ⌃⌥Space (customisable shortcut is planned).").foregroundStyle(.secondary)
            Text("These settings affect only the PlainClick panel, not other apps or macOS.").font(.caption).foregroundStyle(.secondary)
        }
    }
}

private struct LicenceTab: View {
    @ObservedObject var licence: LicenceManager
    @State private var key = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            switch licence.state {
            case .licensed:
                Text("Licensed — PlainClick v1, perpetual personal licence.").font(.headline)
                Text("Works offline. To move it to another Mac, deactivate it here first.").foregroundStyle(.secondary)
                Button("Deactivate this Mac") { Task { await licence.deactivateThisMac() } }
                    .disabled(licence.busy)
            case .trial(let days):
                Text("Trial — \(days) day\(days == 1 ? "" : "s") left.").font(.headline)
                activationForm
            case .trialEnded:
                Text("Your trial has ended.").font(.headline)
                activationForm
            }
            if !licence.message.isEmpty {
                Text(licence.message).fixedSize(horizontal: false, vertical: true)
            }
            Spacer()
            Text("Activation sends your licence key, a random installation ID, the app version and your Mac's model identifier. Nothing about your apps or documents is sent.")
                .font(.caption).foregroundStyle(.secondary)
        }
    }

    private var activationForm: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("US$5.99 one time. A perpetual personal licence for PlainClick v1, including all v1 updates, on up to two Macs you own.")
                .fixedSize(horizontal: false, vertical: true)
            TextField("PLCK-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX", text: $key)
                .textFieldStyle(.roundedBorder)
                .accessibilityLabel("Licence key")
            Button("Activate") { Task { await licence.activate(key: key.trimmingCharacters(in: .whitespacesAndNewlines)) } }
                .disabled(licence.busy || key.isEmpty)
            Text("Activation needs an internet connection once.").font(.caption).foregroundStyle(.secondary)
        }
    }
}

private struct GuideTab: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                Text("Free: make macOS easier to read").font(.headline)
                Text("These are Apple's own settings. They're free, don't need PlainClick, and change the whole system, not one app.")
                Text("1. Open the Apple menu → System Settings.")
                Text("2. Choose Accessibility, then Display.")
                Text("3. Turn on Reduce transparency to replace translucent backgrounds with solid ones.")
                Text("4. Turn on Increase contrast to make borders and controls stand out.")
                Text("Names and locations can differ between macOS versions. If you can't find one, search for it in System Settings. To undo, switch the same settings off.")
                    .foregroundStyle(.secondary)
            }
            .fixedSize(horizontal: false, vertical: true)
        }
    }
}
