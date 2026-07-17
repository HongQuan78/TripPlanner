using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TripPlanner.Domain.Models;

namespace TripPlanner.Infrastructure.Data.Configurations;

internal sealed class TripConfiguration : IEntityTypeConfiguration<Trip>
{
    public void Configure(EntityTypeBuilder<Trip> builder)
    {
        builder.ToTable("trips");

        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).UseIdentityAlwaysColumn();
        builder.Property(t => t.Name).IsRequired().HasMaxLength(200);
        builder.Property(t => t.StartDate).IsRequired();
        builder.Property(t => t.EndDate).IsRequired();
        builder.Property(t => t.UserId).IsRequired();

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(t => t.UserId);

        builder.HasMany(t => t.Days)
            .WithOne()
            .HasForeignKey(d => d.TripId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Navigation(t => t.Days)
            .HasField("_days")
            .UsePropertyAccessMode(PropertyAccessMode.Field);

        builder.HasMany(t => t.SavedPlaces)
            .WithMany()
            .UsingEntity<Dictionary<string, object>>(
                "trip_saved_places",
                right => right
                    .HasOne<Destination>()
                    .WithMany()
                    .HasForeignKey("destination_id")
                    .OnDelete(DeleteBehavior.Cascade),
                left => left
                    .HasOne<Trip>()
                    .WithMany()
                    .HasForeignKey("trip_id")
                    .OnDelete(DeleteBehavior.Cascade),
                join =>
                {
                    join.HasKey("trip_id", "destination_id");
                    join.ToTable("trip_saved_places");
                });

        builder.Navigation(t => t.SavedPlaces)
            .HasField("_savedPlaces")
            .UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}
