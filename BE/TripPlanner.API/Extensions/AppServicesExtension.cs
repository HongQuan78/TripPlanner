using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Application.Services;
using TripPlanner.Application.UseCases.Auth;
using TripPlanner.Application.UseCases.Destination;
using TripPlanner.Application.UseCases.Location;
using TripPlanner.Application.UseCases.SavedPlaces;
using TripPlanner.Application.UseCases.Trip;
using TripPlanner.Application.UseCases.TripDay;
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

        services.AddScoped<IRegisterUserUseCase, RegisterUserUseCase>();
        services.AddScoped<ILoginUserUseCase, LoginUserUseCase>();
        services.AddScoped<ILogoutUseCase, LogoutUseCase>();
        services.AddScoped<IVerifyEmailUseCase, VerifyEmailUseCase>();
        services.AddScoped<IResendVerificationEmailUseCase, ResendVerificationEmailUseCase>();

        services.AddScoped<IGetTripUseCase, GetTripUseCase>();
        services.AddScoped<IGetAllTripsUseCase, GetAllTripsUseCase>();
        services.AddScoped<ICreateTripUseCase, CreateTripUseCase>();
        services.AddScoped<IUpdateTripUseCase, UpdateTripUseCase>();
        services.AddScoped<IGetAllDestinationsUseCase, GetAllDestinationsUseCase>();
        services.AddScoped<IGetDestinationByIdUseCase, GetDestinationByIdUseCase>();
        services.AddScoped<IAddDestinationToTripDayUseCase, AddDestinationToTripDayUseCase>();
        services.AddScoped<IRemoveDestinationFromTripDayUseCase, RemoveDestinationFromTripDayUseCase>();
        services.AddScoped<IReorderDayDestinationsUseCase, ReorderDayDestinationsUseCase>();
        services.AddScoped<IMoveDestinationBetweenDaysUseCase, MoveDestinationBetweenDaysUseCase>();
        services.AddScoped<IDestinationResolver, DestinationResolver>();
        services.AddScoped<IAddDestinationToSavedPlacesUseCase, AddDestinationToSavedPlacesUseCase>();
        services.AddScoped<IRemoveDestinationFromSavedPlacesUseCase, RemoveDestinationFromSavedPlacesUseCase>();
        services.AddScoped<IScheduleSavedPlaceUseCase, ScheduleSavedPlaceUseCase>();
        services.AddScoped<ISearchLocationsUseCase, SearchLocationsUseCase>();
        services.AddScoped<IGetAttractionsForLocationUseCase, GetAttractionsForLocationUseCase>();
        services.AddScoped<IGetDestinationDetailsUseCase, GetDestinationDetailsUseCase>();

        services.AddValidatorsFromAssembly(typeof(CreateTripValidator).Assembly);

        services.AddProblemDetails();
        services.AddExceptionHandler<ExceptionHandlingMiddleware>();

        services.AddResponseCompression();
        return services;
    }
}
