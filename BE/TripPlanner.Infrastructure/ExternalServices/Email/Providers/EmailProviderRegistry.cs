namespace TripPlanner.Infrastructure.ExternalServices.Email.Providers;

internal static class EmailProviderRegistry
{
    internal const string DefaultProviderKey = "Resend";

    private static readonly IEmailProviderModule[] Modules =
    [
        new ResendEmailProviderModule(),
        new GoogleEmailProviderModule()
    ];

    internal static IReadOnlyList<string> SupportedKeys { get; } =
        Modules.Select(module => module.ProviderKey).ToArray();

    internal static bool IsSupported(string? providerSetting)
    {
        if (string.IsNullOrWhiteSpace(providerSetting))
        {
            return true;
        }

        return Find(providerSetting) is not null;
    }

    internal static IEmailProviderModule Resolve(string? providerSetting)
    {
        string key = string.IsNullOrWhiteSpace(providerSetting)
            ? DefaultProviderKey
            : providerSetting.Trim();

        var module = Find(key);
        if (module is null)
        {
            throw new InvalidOperationException(
                $"Email provider '{key}' is not supported. Supported providers: {string.Join(", ", SupportedKeys)}.");
        }

        return module;
    }

    private static IEmailProviderModule? Find(string providerSetting)
    {
        string key = providerSetting.Trim();

        return Modules.FirstOrDefault(module =>
            module.ProviderKey.Equals(key, StringComparison.OrdinalIgnoreCase));
    }
}
