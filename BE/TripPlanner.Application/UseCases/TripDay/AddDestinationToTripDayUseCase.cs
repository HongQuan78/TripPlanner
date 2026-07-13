using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Requests;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Helpers;
using TripPlanner.Application.Interfaces.Mapping;
using TripPlanner.Application.Interfaces.Repositories;
using TripPlanner.Application.Interfaces.Services;
using TripPlanner.Domain.Models;

namespace TripPlanner.Application.UseCases.TripDay;

public class AddDestinationToTripDayUseCase(
    ITripRepository tripRepository,
    IDestinationRepository destinationRepository,
    IDestinationDetailsService destinationDetailsService,
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

        var resolution = await ResolveDestinationAsync(request, cancellationToken);

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

    private async Task<Result<Domain.Models.Destination>> ResolveDestinationAsync(
        AddDestinationToDayRequest request,
        CancellationToken cancellationToken)
    {
        if (request.DestinationId.HasValue)
        {
            var destination = await destinationRepository.GetByIdAsync(request.DestinationId.Value, cancellationToken);

            if (destination is null)
            {
                return Result<Domain.Models.Destination>.Failure(ErrorType.NotFound, "Destination Not Found");
            }

            return Result<Domain.Models.Destination>.Success(destination);
        }

        if (string.IsNullOrWhiteSpace(request.Xid))
        {
            return Result<Domain.Models.Destination>.Failure(ErrorType.BadRequest, "Either DestinationId or Xid is required.");
        }

        var xid = request.Xid.Trim();
        var existing = await destinationRepository.GetByExternalIdAsync(xid, cancellationToken);

        if (existing is not null)
        {
            return Result<Domain.Models.Destination>.Success(existing);
        }

        try
        {
            var details = await destinationDetailsService.GetDetailsAsync(xid, cancellationToken);

            if (details is null)
            {
                return Result<Domain.Models.Destination>.Failure(ErrorType.NotFound, "Destination Not Found");
            }

            var rating = details.Rating ?? 0;
            Domain.Models.Destination imported = DestinationCategoryHelper.IsRestaurantCategory(details.Category)
                ? new Restaurant(details.Name, rating, details.Category ?? "Unknown", false, details.Xid)
                : new Landmark(details.Name, rating, details.OpeningHours ?? string.Empty, details.Xid);

            destinationRepository.Add(imported);
            return Result<Domain.Models.Destination>.Success(imported);
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException)
        {
            return Result<Domain.Models.Destination>.Failure(ErrorType.ServiceUnavailable, "Destination details are currently unavailable.");
        }
    }
}
