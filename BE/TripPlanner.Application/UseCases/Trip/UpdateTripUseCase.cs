using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Requests;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Mapping;
using TripPlanner.Application.Interfaces.Repositories;

namespace TripPlanner.Application.UseCases.Trip;

public class UpdateTripUseCase(ITripRepository tripRepository, IUnitOfWork unitOfWork, IApplicationMapper mapper) : IUpdateTripUseCase
{
    public async Task<Result<TripResponse>> ExecuteAsync(int id, UpdateTripRequest request, int userId, CancellationToken cancellationToken = default)
    {
        var trip = await tripRepository.GetWithDaysAndDestinationsAsync(id, userId, cancellationToken);

        if (trip is null)
        {
            return Result<TripResponse>.Failure(ErrorType.NotFound, "Trip Not Found.");
        }

        var startDate = request.StartDate!.Value;
        var endDate = request.EndDate!.Value;

        var droppedDays = trip.Days
            .Where(day => (day.Day < startDate || day.Day > endDate) && day.Destinations.Count > 0)
            .ToList();

        if (droppedDays.Count > 0 && !request.Confirmed)
        {
            var destinationCount = droppedDays.Sum(day => day.Destinations.Count);
            return Result<TripResponse>.Failure(
                ErrorType.Conflict,
                $"Reducing the date range removes {droppedDays.Count} day(s) with {destinationCount} planned destination(s). Resend with confirmed=true to proceed.");
        }

        trip.Update(request.Name!, startDate, endDate);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<TripResponse>.Success(mapper.MapToTripResponse(trip));
    }
}
