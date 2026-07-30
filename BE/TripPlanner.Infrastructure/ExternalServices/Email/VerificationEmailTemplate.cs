using System.Reflection;

namespace TripPlanner.Infrastructure.ExternalServices.Email;

internal static class VerificationEmailTemplate
{
    private const string ResourceName = "TripPlanner.Infrastructure.ExternalServices.Email.Templates.verification-email.html";

    private static readonly Lazy<string> Template = new(Load);

    internal static string Html => Template.Value;

    private static string Load()
    {
        var assembly = typeof(VerificationEmailTemplate).GetTypeInfo().Assembly;
        using var stream = assembly.GetManifestResourceStream(ResourceName);
        if (stream is null)
        {
            throw new InvalidOperationException(
                $"Embedded email template '{ResourceName}' was not found in assembly '{assembly.GetName().Name}'.");
        }

        using var reader = new StreamReader(stream);
        var html = reader.ReadToEnd();
        if (string.IsNullOrWhiteSpace(html))
        {
            throw new InvalidOperationException(
                $"Embedded email template '{ResourceName}' is empty.");
        }

        return html;
    }
}
