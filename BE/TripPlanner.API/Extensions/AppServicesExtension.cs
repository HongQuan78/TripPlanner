using TripPlanner.Application.Extensions;
using TripPlanner.Infrastructure.Extensions;
using FluentValidation;
using TripPlanner.API.Validators;
using TripPlanner.API.Middleware;

namespace TripPlanner.API.Extensions;

public static class AppServicesExtension
{
    public static IServiceCollection AddApplicationServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddInfrastructureServices(configuration);
        services.AddJwtAuthentication(configuration);
        services.AddApplicationUseCases();

        services.AddValidatorsFromAssembly(typeof(CreateTripValidator).Assembly);

        services.AddProblemDetails();
        services.AddExceptionHandler<ExceptionHandlingMiddleware>();

        services.AddResponseCompression();
        return services;
    }
}
