using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Requests;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Mapping;
using TripPlanner.Application.Interfaces.Repositories;

namespace TripPlanner.Application.UseCases.Trip;

public class CreateTripUseCase(ITripRepository tripRepository, IUnitOfWork unitOfWork, IApplicationMapper mapper) : ICreateTripUseCase
{
    public async Task<Result<TripResponse>> ExecuteAsync(CreateTripRequest request, CancellationToken cancellationToken = default)
    {
        var trip = new Domain.Models.Trip(request.Name!, request.StartDate!.Value, request.EndDate!.Value);
        tripRepository.Add(trip);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<TripResponse>.Success(mapper.MapToTripResponse(trip));
    }
}
