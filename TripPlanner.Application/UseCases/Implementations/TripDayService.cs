using AutoMapper;
using TripPlanner.Application.Interfaces;
using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Requests;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Helpers;
using TripPlanner.Domain.Models;

namespace TripPlanner.Application.UseCases.Implementations;

public class TripDayService(
    ITripRepository tripRepository,
    IDestinationRepository destinationRepository,
    IUnitOfWork unitOfWork,
    IMapper mapper) : ITripDayService
{
    public async Task<Result<TripDayResponse>> AddDestinationToTripDayAsync(
        int tripId,
        string dateString,
        AddDestinationToDayRequest dto,
        CancellationToken cancellationToken = default)
    {
        Trip? trip = await tripRepository.GetWithDaysAndDestinationsAsync(tripId, cancellationToken);

        if (trip is null)
        {
            return Result<TripDayResponse>.Failure(ErrorType.NotFound, "Trip Not Found");
        }

        DateOnly date = DateHelper.ToDateOnly(dateString);
        TripDay? tripDay = trip.Days.FirstOrDefault(x => x.Day == date);

        if (tripDay is null)
        {
            return Result<TripDayResponse>.Failure(ErrorType.NotFound, "Day Not Found");
        }

        Destination? destination = await destinationRepository.GetByIdAsync(dto.DestinationId, cancellationToken);

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

        return Result<TripDayResponse>.Success(mapper.Map<TripDayResponse>(tripDay));
    }

    public async Task<Result> RemoveDestinationFromTripDayAsync(
        int id,
        string dateString,
        int destinationId,
        CancellationToken cancellationToken = default)
    {
        Trip? trip = await tripRepository.GetWithDaysAndDestinationsAsync(id, cancellationToken);

        if (trip is null)
        {
            return Result.Failure(ErrorType.NotFound, "Trip Not Found");
        }

        DateOnly date = DateHelper.ToDateOnly(dateString);
        TripDay? tripDay = trip.Days.FirstOrDefault(x => x.Day == date);

        if (tripDay is null)
        {
            return Result.Failure(ErrorType.NotFound, "Day Not Found");
        }

        Destination? destination = tripDay.Destinations.FirstOrDefault(x => x.Id == destinationId);

        if (destination is null)
        {
            return Result.Failure(ErrorType.NotFound, "Destination is not scheduled on this day.");
        }

        tripDay.RemoveDestination(destination);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
