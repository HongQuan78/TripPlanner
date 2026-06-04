using TripPlanner.API.Common;
using TripPlanner.API.DTOs.Responses;
using TripPlanner.API.Parameters;

namespace TripPlanner.API.Services.Interface;

public interface IDestinationService
{
    public Result<List<DestinationResponse>> GetAllDestinations(DestinationFilterParameter filter);
    public Result<DestinationResponse> GetDestinationById(int id);
}