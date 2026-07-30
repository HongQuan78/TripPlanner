using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Requests;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Mapping;
using TripPlanner.Application.Interfaces.Repositories;
using TripPlanner.Application.Interfaces.Services;

namespace TripPlanner.Application.UseCases.TripDay;

public class AddDestinationToTripDayUseCase(
    ITripRepository tripRepository,
    IDestinationResolver destinationResolver,
    IUnitOfWork unitOfWork,
    IApplicationMapper mapper) : IAddDestinationToTripDayUseCase
{
    public async Task<Result<TripDayResponse>> ExecuteAsync(
        int tripId,
        DateOnly date,
        AddDestinationToDayRequest request,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var trip = await tripRepository.GetWithDaysAndDestinationsAsync(tripId, userId, cancellationToken);

        if (trip is null)
        {
            return Result<TripDayResponse>.Failure(ErrorType.NotFound, "Trip Not Found");
        }

        var tripDay = trip.Days.FirstOrDefault(x => x.Day == date);

        if (tripDay is null)
        {
            return Result<TripDayResponse>.Failure(ErrorType.NotFound, "Day Not Found");
        }

        var resolution = await destinationResolver.ResolveAsync(request.DestinationId, request.Xid, cancellationToken);

        if (!resolution.IsSuccess)
        {
            return Result<TripDayResponse>.Failure(resolution.Error!.ErrorType, resolution.Error.Description);
        }

        var destination = resolution.Data!;

        if (tripDay.Destinations.Any(x => x == destination || (destination.Id != 0 && x.Id == destination.Id)))
        {
            return Result<TripDayResponse>.Failure(ErrorType.BadRequest, "Destination already exists in this day.");
        }

        tripDay.AddDestination(destination);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<TripDayResponse>.Success(mapper.MapToTripDayResponse(tripDay));
    }
}
