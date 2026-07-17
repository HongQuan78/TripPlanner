using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Requests;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Mapping;
using TripPlanner.Application.Interfaces.Repositories;
using TripPlanner.Application.Interfaces.Services;

namespace TripPlanner.Application.UseCases.SavedPlaces;

public class AddDestinationToSavedPlacesUseCase(
    ITripRepository tripRepository,
    IDestinationResolver destinationResolver,
    IUnitOfWork unitOfWork,
    IApplicationMapper mapper) : IAddDestinationToSavedPlacesUseCase
{
    public async Task<Result<TripResponse>> ExecuteAsync(
        int tripId,
        AddSavedPlaceRequest request,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var trip = await tripRepository.GetWithDaysAndDestinationsAsync(tripId, userId, cancellationToken);

        if (trip is null)
        {
            return Result<TripResponse>.Failure(ErrorType.NotFound, "Trip Not Found");
        }

        var resolution = await destinationResolver.ResolveAsync(request.DestinationId, request.Xid, cancellationToken);

        if (!resolution.IsSuccess)
        {
            return Result<TripResponse>.Failure(resolution.Error!.ErrorType, resolution.Error.Description);
        }

        var destination = resolution.Data!;

        if (trip.SavedPlaces.Any(x => x == destination || (destination.Id != 0 && x.Id == destination.Id)))
        {
            return Result<TripResponse>.Failure(ErrorType.BadRequest, "Destination already exists in Saved Places.");
        }

        trip.AddSavedPlace(destination);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<TripResponse>.Success(mapper.MapToTripResponse(trip));
    }
}
