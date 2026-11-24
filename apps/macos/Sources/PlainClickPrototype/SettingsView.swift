import PlainClickCore
import SwiftUI

struct SettingsView: View {
    @ObservedObject var settings: AppSettings
    @ObservedObject var licence: LicenceManager
    var initialTab: Tab = .apps
    @State private var tab: Tab = .apps

    enum Tab: Hashable { case general, apps, appearance, licence, guide }

    var body: some View {
        TabView(selection: $tab) {
            GeneralTab(settings: settings)
                .tabItem { Label("General", systemImage: "gearshape") }.tag(Tab.general)
            AppsTab(settings: settings)
                .tabItem { Label("Apps", systemImage: "square.grid.2x2") }.tag(Tab.apps)
            AppearanceTab(settings: settings)
                .tabItem { Label("Panel", systemImage: "rectangle.on.rectangle") }.tag(Tab.appearance)
            LicenceTab(licence: licence)
                .tabItem { Label("Licence", systemImage: "key") }.tag(Tab.licence)
            GuideTab()
                .tabItem { Label("Free guide", systemImage: "book") }.tag(Tab.guide)
        }
        .padding(20)
        .frame(width: 600, height: 500)
        .onAppear { tab = initialTab }
    }
}

private struct GeneralTab: View {
    static let appVersion: String = {
        let info = Bundle.main.infoDictionary
        let short = info?["CFBundleShortVersionString"] as? String ?? "?"
        let build = info?["CFBundleVersion"] as? String ?? "?"
        return "\(short) (\(build))"
    }()

    @ObservedObject var settings: AppSettings
    @State private var launchAtLogin = LaunchAtLogin.isEnabled

    var body: some View {
        Form {
            Section("Startup") {
                Toggle("Launch PlainClick at login", isOn: Binding(
                    get: { launchAtLogin },
                    set: { on in
                        LaunchAtLogin.set(on)
                        launchAtLogin = LaunchAtLogin.isEnabled
                    }))
                Text("Works when PlainClick runs from the Applications folder.").font(.caption).foregroundStyle(.secondary)
            }
            .onReceive(NotificationCenter.default.publisher(for: LaunchAtLogin.didChange)) { _ in
                launchAtLogin = LaunchAtLogin.isEnabled
            }
            .onReceive(NotificationCenter.default.publisher(for: NSWindow.didBecomeKeyNotification)) { _ in
                launchAtLogin = LaunchAtLogin.isEnabled
            }
            Section("Keyboard") {
                LabeledContent("Show or hide the panel") { KeyCap("⌃⌥P") }
                Toggle("Quick keys: ⌃⌥1 – ⌃⌥9 press the panel's actions", isOn: $settings.quickKeys)
                Text("Quick keys use the same safety checks as clicking: they only press tested commands in the front app. Turn them off if they clash with another app's shortcuts.")
                    .font(.caption).foregroundStyle(.secondary)
            }
            Section("About") {
                LabeledContent("Version", value: Self.appVersion)
            }
        }
        .formStyle(.grouped)
    }
}

private struct KeyCap: View {
    let text: String
    init(_ text: String) { self.text = text }
    var body: some View {
        Text(text)
            .font(.callout.monospaced())
            .padding(.horizontal, 6).padding(.vertical, 2)
            .background(RoundedRectangle(cornerRadius: 5).stroke(Color(nsColor: .separatorColor)))
    }
}

private struct AppsTab: View {
    @ObservedObject var settings: AppSettings

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("PlainClick works only with these apps and actions. Drag to reorder; the panel shows them in this order.")
                .font(.callout).foregroundStyle(.secondary)
            List {
                ForEach(ActionCatalog.adapters, id: \.bundleID) { adapter in
                    Section {
                        if settings.isEnabled(adapter.bundleID) {
                            ForEach(settings.visibleActions(for: adapter)) { action in
                                HStack {
                                    Image(systemName: "line.3.horizontal").foregroundStyle(.tertiary).accessibilityHidden(true)
                                    Image(systemName: action.symbol).frame(width: 18).foregroundStyle(Color.accentColor).accessibilityHidden(true)
                                    Text(action.label)
                                    Spacer()
                                    Button { settings.move(action, in: adapter, by: -1) } label: { Image(systemName: "chevron.up") }
                                        .buttonStyle(.borderless).help("Move up")
                                        .accessibilityLabel("Move \(action.label) up")
                                    Button { settings.move(action, in: adapter, by: 1) } label: { Image(systemName: "chevron.down") }
                                        .buttonStyle(.borderless).help("Move down")
                                        .accessibilityLabel("Move \(action.label) down")
                                    Button { settings.togglePin(action, in: adapter) } label: { Image(systemName: "pin.slash") }
                                        .buttonStyle(.borderless).help("Unpin")
                                        .accessibilityLabel("Unpin \(action.label)")
                                }
                            }
                            .onMove { settings.reorder(in: adapter, from: $0, to: $1) }
                            let unpinned = adapter.supportedActions.filter { !settings.isPinned($0, in: adapter) }
                            if !unpinned.isEmpty {
                                HStack(spacing: 6) {
                                    Text("Add:").foregroundStyle(.secondary)
                                    ForEach(unpinned) { action in
                                        Button { settings.togglePin(action, in: adapter) } label: {
                                            Label(action.label, systemImage: "plus")
                                        }
                                        .controlSize(.small)
                                        .accessibilityLabel("Pin \(action.label)")
                                    }
                                }
                            }
                        }
                    } header: {
                        HStack(spacing: 8) {
                            AppIcon(bundleID: adapter.bundleID)
                            Text(adapter.displayName).font(.headline)
                            Spacer()
                            if settings.pinned[adapter.bundleID] != nil {
                                Button("Reset") { settings.resetOrder(for: adapter) }
                                    .buttonStyle(.borderless).controlSize(.small)
                                    .accessibilityLabel("Reset \(adapter.displayName) actions")
                            }
                            Toggle("", isOn: Binding(get: { settings.isEnabled(adapter.bundleID) },
                                                     set: { settings.setEnabled(adapter.bundleID, $0) }))
                                .toggleStyle(.switch).controlSize(.small).labelsHidden()
                                .accessibilityLabel("Use PlainClick with \(adapter.displayName)")
                        }
                        .padding(.vertical, 2)
                    }
                }
            }
            .listStyle(.inset(alternatesRowBackgrounds: false))
            Text("Actions are listed as tested only after they pass repeated tests on a stated macOS version. See the compatibility page on the website.")
                .font(.caption).foregroundStyle(.secondary)
        }
    }
}

private struct AppIcon: View {
    let bundleID: String
    var body: some View {
        Group {
            if let url = NSWorkspace.shared.urlForApplication(withBundleIdentifier: bundleID) {
                Image(nsImage: NSWorkspace.shared.icon(forFile: url.path)).resizable()
            } else {
                Image(systemName: "app").resizable()
            }
        }
        .frame(width: 20, height: 20)
        .accessibilityHidden(true)
    }
}

private struct AppearanceTab: View {
    @ObservedObject var settings: AppSettings

    var body: some View {
        Form {
            Section("Panel") {
                Picker("Appearance", selection: $settings.appearance) {
                    ForEach(AppSettings.Appearance.allCases) { Text($0.label).tag($0) }
                }
                .pickerStyle(.segmented)
                Picker("Layout", selection: $settings.comfortable) {
                    Text("Comfortable").tag(true)
                    Text("Compact").tag(false)
                }
                .pickerStyle(.segmented)
                Toggle("Show icons next to labels", isOn: $settings.showIcons)
            }
            Section {
                Text("These settings affect only the PlainClick panel, not other apps or macOS. Drag the panel anywhere; it remembers its place.")
                    .font(.caption).foregroundStyle(.secondary)
            }
        }
        .formStyle(.grouped)
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
                Text("Works offline for up to \(LicenceManager.offlineDays) days at a time; PlainClick confirms the licence when you're online. To move it to another Mac, deactivate it here first.")
                    .foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
                Button("Deactivate this Mac") { Task { await licence.deactivateThisMac() } }
                    .disabled(licence.busy)
            case .needsCheck:
                Text("Connect to the internet to confirm your licence.").font(.headline)
                Text("PlainClick works offline for up to \(LicenceManager.offlineDays) days at a time. Your licence is still saved on this Mac; once PlainClick can reach Dodo Payments, the panel works again.")
                    .foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
                HStack {
                    Button("Check Now") { Task { await licence.checkNow() } }
                        .disabled(licence.busy)
                    Button("Deactivate this Mac") { Task { await licence.deactivateThisMac() } }
                        .disabled(licence.busy)
                }
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
            Text("Activation sends your licence key and your Mac's model identifier (like \"Mac14,2\") to Dodo Payments, which sells PlainClick and checks licences. Nothing about your apps or documents is sent.")
                .font(.caption).foregroundStyle(.secondary)
        }
    }

    private var activationForm: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("US$5.99 one time. A perpetual personal licence for PlainClick v1, including all v1 updates, on up to two Macs you own.")
                .fixedSize(horizontal: false, vertical: true)
            TextField("Paste the licence key from your purchase email", text: $key)
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
