using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces.Services;

namespace TripPlanner.Application.UseCases.Location;

public class GetDestinationDetailsUseCase(IDestinationDetailsService destinationDetailsService) : IGetDestinationDetailsUseCase
{
    public async Task<Result<DestinationDetailsResponse>> ExecuteAsync(string xid, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(xid))
        {
            return Result<DestinationDetailsResponse>.Failure(ErrorType.BadRequest, "Xid is required.");
        }

        try
        {
            var details = await destinationDetailsService.GetDetailsAsync(xid.Trim(), cancellationToken);
            if (details is null)
            {
                return Result<DestinationDetailsResponse>.Failure(ErrorType.NotFound, "Destination Not Found");
            }

            return Result<DestinationDetailsResponse>.Success(details);
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException)
        {
            return Result<DestinationDetailsResponse>.Failure(ErrorType.ServiceUnavailable, "Destination details are currently unavailable.");
        }
    }
}
