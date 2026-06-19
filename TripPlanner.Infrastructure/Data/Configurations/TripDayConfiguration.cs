using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TripPlanner.Domain.Models;

namespace TripPlanner.Infrastructure.Data.Configurations;

internal sealed class TripDayConfiguration : IEntityTypeConfiguration<TripDay>
{
    public void Configure(EntityTypeBuilder<TripDay> builder)
    {
        builder.ToTable("trip_days");

        builder.HasKey(d => d.Id);
        builder.Property(d => d.Id).UseIdentityAlwaysColumn();
        builder.Property(d => d.TripId).IsRequired();
        builder.Property(d => d.Day).IsRequired();

        builder.HasIndex(d => new { d.TripId, d.Day }).IsUnique();

        builder.HasMany(d => d.Destinations)
            .WithMany()
            .UsingEntity<Dictionary<string, object>>(
                "trip_day_destinations",
                right => right
                    .HasOne<Destination>()
                    .WithMany()
                    .HasForeignKey("destination_id")
                    .OnDelete(DeleteBehavior.Cascade),
                left => left
                    .HasOne<TripDay>()
                    .WithMany()
                    .HasForeignKey("trip_day_id")
                    .OnDelete(DeleteBehavior.Cascade),
                join =>
                {
                    join.HasKey("trip_day_id", "destination_id");
                    join.ToTable("trip_day_destinations");
                });

        builder.Navigation(d => d.Destinations)
            .HasField("_destinations")
            .UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}
