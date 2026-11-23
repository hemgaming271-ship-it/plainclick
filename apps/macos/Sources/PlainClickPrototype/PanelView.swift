import PlainClickCore
import SwiftUI

struct PanelView: View {
    @ObservedObject var model: PanelModel
    @ObservedObject var settings: AppSettings
    @ObservedObject var licence: LicenceManager
    let onPerform: (ActionDefinition) -> Void
    let onEnable: () -> Void
    let onOpenSettings: () -> Void
    var onOpenPreferences: () -> Void = {}

    private var comfortable: Bool { settings.comfortable }

    var body: some View {
        VStack(alignment: .leading, spacing: comfortable ? 10 : 6) {
            header
            Divider()

            if model.paused {
                StateCard(symbol: "pause.circle.fill", tint: .orange,
                          text: "PlainClick is paused. Resume it from the menu bar.")
            } else if !licence.isPanelAllowed {
                StateCard(symbol: "clock.badge.exclamationmark", tint: .orange,
                          text: "Your 7-day trial has ended. A licence is US$5.99, one time. The free appearance guide is still available in Settings.") {
                    Button("Open Licence Settings…", action: onOpenSettings).controlSize(.small)
                }
            } else if !model.trusted {
                StateCard(symbol: "hand.raised.fill", tint: .blue,
                          text: "To press commands in other apps, PlainClick needs Accessibility access. It reads only those apps' menu commands, on this Mac. You can turn this off at any time in System Settings → Privacy & Security → Accessibility.") {
                    Button("Turn on app control…", action: onEnable)
                        .buttonStyle(.borderedProminent).controlSize(.small)
                }
            } else if !model.supported {
                StateCard(symbol: "questionmark.app.dashed", tint: .secondary,
                          text: "\(model.targetName) isn't supported yet. PlainClick only offers commands it has been tested with.")
            } else if model.disabledByUser {
                StateCard(symbol: "nosign", tint: .secondary,
                          text: "PlainClick is turned off for \(model.targetName). Turn it back on in Settings → Apps.")
            } else if model.actions.isEmpty {
                StateCard(symbol: "pin.slash", tint: .secondary,
                          text: "No actions pinned for \(model.targetName). Choose some in Settings → Apps.")
            } else {
                ForEach(Array(model.actions.enumerated()), id: \.element.id) { index, action in
                    Button { onPerform(action.def) } label: {
                        HStack(spacing: 8) {
                            if settings.showIcons {
                                Image(systemName: action.def.symbol)
                                    .frame(width: 18)
                                    .foregroundStyle(Color.accentColor)
                                    .accessibilityHidden(true)
                            }
                            Text(action.def.label)
                            Spacer(minLength: 4)
                            if settings.quickKeys && index < 9 {
                                Text("⌃⌥\(index + 1)")
                                    .font(.caption.monospacedDigit())
                                    .foregroundStyle(.secondary)
                                    .padding(.horizontal, 5).padding(.vertical, 1)
                                    .background(RoundedRectangle(cornerRadius: 4).fill(Color.primary.opacity(0.06)))
                                    .accessibilityLabel("Shortcut Control Option \(index + 1)")
                            }
                        }
                    }
                    .buttonStyle(PlainActionStyle(comfortable: comfortable))
                    .disabled(!action.availability.isRunnable)
                    .help(action.availability.explanation)
                    .accessibilityLabel(action.def.label)
                    .accessibilityHint(action.availability.explanation)
                    .background(GeometryReader { g in
                        Color.clear.preference(key: ButtonFramesKey.self, value: [action.def.label: g.frame(in: .global)])
                    })
                }
            }

            if !model.status.isEmpty {
                Label(model.status, systemImage: model.status.contains("Nothing was sent") || model.status.contains("could not")
                      ? "exclamationmark.triangle.fill" : "checkmark.circle.fill")
                    .font(.callout)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                    .transition(.opacity)
            }

            if case .trial(let days) = licence.state {
                HStack(spacing: 4) {
                    Image(systemName: "clock").accessibilityHidden(true)
                    Text("Trial: \(days) day\(days == 1 ? "" : "s") left")
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }
        }
        .padding(comfortable ? 14 : 10)
        .frame(width: comfortable ? 270 : 230, alignment: .leading)
        .animation(.easeOut(duration: 0.15), value: model.status)
        .onPreferenceChange(ButtonFramesKey.self) { frames in PanelButtonFrames.shared.set(frames) }
    }

    private var header: some View {
        HStack(spacing: 8) {
            Group {
                if let icon = model.targetIcon {
                    Image(nsImage: icon).resizable()
                } else {
                    Image(systemName: "app.dashed").resizable().foregroundStyle(.secondary)
                }
            }
            .frame(width: 22, height: 22)
            .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 0) {
                Text("Target").font(.caption2).foregroundStyle(.secondary)
                Text(model.targetName).fontWeight(.semibold).lineLimit(1)
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel("Target app: \(model.targetName)")
            Spacer(minLength: 4)
            Circle()
                .fill(statusColor)
                .frame(width: 8, height: 8)
                .help(statusHelp)
                .accessibilityLabel(statusHelp)
            Button(action: onOpenPreferences) {
                Image(systemName: "gearshape")
            }
            .buttonStyle(.borderless)
            .help("PlainClick Settings")
            .accessibilityLabel("PlainClick Settings")
        }
    }

    private var statusColor: Color {
        if model.paused || !licence.isPanelAllowed { return .orange }
        if !model.trusted { return .red }
        return model.supported && !model.disabledByUser ? .green : .gray
    }

    private var statusHelp: String {
        if model.paused { return "Paused" }
        if !licence.isPanelAllowed { return "Trial ended" }
        if !model.trusted { return "App control is off" }
        return model.supported && !model.disabledByUser ? "Ready" : "Not available for this app"
    }
}

/// A short explanation with an icon and an optional call to action.
private struct StateCard<Actions: View>: View {
    let symbol: String
    let tint: Color
    let text: String
    @ViewBuilder var actions: () -> Actions

    init(symbol: String, tint: Color, text: String, @ViewBuilder actions: @escaping () -> Actions = { EmptyView() }) {
        self.symbol = symbol
        self.tint = tint
        self.text = text
        self.actions = actions
    }

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: symbol).font(.title3).foregroundStyle(tint).accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 8) {
                Text(text).font(.callout).fixedSize(horizontal: false, vertical: true)
                actions()
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 8).fill(Color.primary.opacity(0.04)))
    }
}

/// Button frames in the hosting view's coordinate space (top-left origin). Used only by the --ui-test runner
/// to click the real buttons; harmless in normal use.
struct ButtonFramesKey: PreferenceKey {
    static let defaultValue: [String: CGRect] = [:]
    static func reduce(value: inout [String: CGRect], nextValue: () -> [String: CGRect]) {
        value.merge(nextValue(), uniquingKeysWith: { $1 })
    }
}

final class PanelButtonFrames: @unchecked Sendable {
    static let shared = PanelButtonFrames()
    private let lock = NSLock()
    private var frames: [String: CGRect] = [:]
    func set(_ f: [String: CGRect]) { lock.lock(); frames = f; lock.unlock() }
    func frame(_ label: String) -> CGRect? { lock.lock(); defer { lock.unlock() }; return frames[label] }
}

/// Solid, bordered, high-legibility buttons. No translucency.
struct PlainActionStyle: ButtonStyle {
    let comfortable: Bool
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(comfortable ? .body : .callout)
            .padding(.vertical, comfortable ? 8 : 4)
            .padding(.horizontal, 10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 8)
                    .fill(configuration.isPressed ? Color.accentColor.opacity(0.22) : Color(nsColor: .controlBackgroundColor))
            )
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(configuration.isPressed ? Color.accentColor : Color(nsColor: .separatorColor), lineWidth: 1))
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .foregroundStyle(isEnabled ? Color.primary : Color.secondary)
            .contentShape(Rectangle())
    }
}
