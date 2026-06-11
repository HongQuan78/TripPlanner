using Microsoft.EntityFrameworkCore;
using TripPlanner.Domain.Models;

namespace TripPlanner.Application.Interfaces;

public interface ITripPlannerDbContext
{
    DbSet<Trip> Trips { get; }
    DbSet<Destination> Destinations { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
