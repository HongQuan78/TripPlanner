using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Requests;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Mapping;
using TripPlanner.Application.Interfaces.Repositories;

namespace TripPlanner.Application.UseCases.TripDay;

public class AddDestinationToTripDayUseCase(
    ITripRepository tripRepository,
    IDestinationRepository destinationRepository,
    IUnitOfWork unitOfWork,
    IApplicationMapper mapper) : IAddDestinationToTripDayUseCase
{
    public async Task<Result<TripDayResponse>> ExecuteAsync(
        int tripId,
        DateOnly date,
        AddDestinationToDayRequest request,
        CancellationToken cancellationToken = default)
    {
        var trip = await tripRepository.GetWithDaysAndDestinationsAsync(tripId, cancellationToken);

        if (trip is null)
        {
            return Result<TripDayResponse>.Failure(ErrorType.NotFound, "Trip Not Found");
        }

        var tripDay = trip.Days.FirstOrDefault(x => x.Day == date);

        if (tripDay is null)
        {
            return Result<TripDayResponse>.Failure(ErrorType.NotFound, "Day Not Found");
        }

        var destination = await destinationRepository.GetByIdAsync(request.DestinationId, cancellationToken);

        if (destination is null)
        {
            return Result<TripDayResponse>.Failure(ErrorType.NotFound, "Destination Not Found");
        }

        if (tripDay.Destinations.Any(x => x.Id == destination.Id))
        {
            return Result<TripDayResponse>.Failure(ErrorType.BadRequest, "Destination already exists in this day.");
        }

        tripDay.AddDestination(destination);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<TripDayResponse>.Success(mapper.MapToTripDayResponse(tripDay));
    }
}
