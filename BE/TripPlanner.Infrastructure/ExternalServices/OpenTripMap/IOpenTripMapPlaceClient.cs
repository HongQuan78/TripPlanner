namespace TripPlanner.Infrastructure.ExternalServices.OpenTripMap;

internal interface IOpenTripMapPlaceClient
{
    Task<OpenTripMapPlaceModel?> GetPlaceAsync(string xid, CancellationToken cancellationToken = default);
}
