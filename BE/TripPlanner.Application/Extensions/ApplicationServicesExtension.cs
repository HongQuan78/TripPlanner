using Microsoft.Extensions.DependencyInjection;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Application.Services;
using TripPlanner.Application.UseCases.Auth;
using TripPlanner.Application.UseCases.Destination;
using TripPlanner.Application.UseCases.Location;
using TripPlanner.Application.UseCases.SavedPlaces;
using TripPlanner.Application.UseCases.Trip;
using TripPlanner.Application.UseCases.TripDay;

namespace TripPlanner.Application.Extensions;

public static class ApplicationServicesExtension
{
    public static IServiceCollection AddApplicationUseCases(this IServiceCollection services)
    {
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

        services.AddScoped<IAddDestinationToSavedPlacesUseCase, AddDestinationToSavedPlacesUseCase>();
        services.AddScoped<IRemoveDestinationFromSavedPlacesUseCase, RemoveDestinationFromSavedPlacesUseCase>();
        services.AddScoped<IScheduleSavedPlaceUseCase, ScheduleSavedPlaceUseCase>();

        services.AddScoped<ISearchLocationsUseCase, SearchLocationsUseCase>();
        services.AddScoped<IGetAttractionsForLocationUseCase, GetAttractionsForLocationUseCase>();
        services.AddScoped<IGetDestinationDetailsUseCase, GetDestinationDetailsUseCase>();

        services.AddScoped<IDestinationResolver, DestinationResolver>();

        return services;
    }
}
