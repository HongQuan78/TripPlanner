using AutoMapper;
using TripPlanner.Application.Interfaces;
using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Requests;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Helpers;
using TripPlanner.Domain.Models;

namespace TripPlanner.Application.UseCases.Implementations;

public class TripService(
    ITripRepository tripRepository,
    IUnitOfWork unitOfWork,
    IMapper mapper) : ITripService
{
    public async Task<Result<TripResponse>> CreateTripAsync(CreateTripRequest dto, CancellationToken cancellationToken = default)
    {
        Trip trip = new(dto.Name!, DateHelper.ToDateOnly(dto.StartDate!), DateHelper.ToDateOnly(dto.EndDate!));
        tripRepository.Add(trip);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<TripResponse>.Success(mapper.Map<TripResponse>(trip));
    }

    public async Task<Result<List<TripResponse>>> GetAllTripsAsync(CancellationToken cancellationToken = default)
    {
        List<Trip> trips = await tripRepository.GetAllWithDaysAndDestinationsAsync(cancellationToken);
        return Result<List<TripResponse>>.Success(mapper.Map<List<TripResponse>>(trips));
    }

    public async Task<Result<TripResponse>> GetTripAsync(int id, CancellationToken cancellationToken = default)
    {
        Trip? trip = await tripRepository.GetWithDaysAndDestinationsAsync(id, cancellationToken);

        if (trip is null)
        {
            return Result<TripResponse>.Failure(ErrorType.NotFound, "Trip Not Found.");
        }

        return Result<TripResponse>.Success(mapper.Map<TripResponse>(trip));
    }
}
