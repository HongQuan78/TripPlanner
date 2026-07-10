using Microsoft.EntityFrameworkCore;
using TripPlanner.Domain.Models;

namespace TripPlanner.Infrastructure.Data;

public class TripPlannerDbContext(DbContextOptions<TripPlannerDbContext> options)
    : DbContext(options)
{
    public DbSet<Trip> Trips => Set<Trip>();
    public DbSet<Destination> Destinations => Set<Destination>();
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(TripPlannerDbContext).Assembly);
    }
}
