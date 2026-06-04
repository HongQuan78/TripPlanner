using SharpGrip.FluentValidation.AutoValidation.Endpoints.Extensions;
using TripPlanner.API.Endpoints;
namespace TripPlanner.API.Extensions;
public static class RouteExtension
{
    public static WebApplication AddRoute(this WebApplication app)
    {  
        app.MapGroup("/api/destinations")
        .WithTags("Destinations")
        .MapDestinationEndpoints().AddFluentValidationAutoValidation();
        app.MapGroup("/api/trips")
        .WithTags("Trips")
        .MapTripEndpoints().AddFluentValidationAutoValidation();
        return app;
    }
}