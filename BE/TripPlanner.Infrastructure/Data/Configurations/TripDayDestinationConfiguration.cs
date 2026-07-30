using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TripPlanner.Domain.Models;

namespace TripPlanner.Infrastructure.Data.Configurations;

internal sealed class TripDayDestinationConfiguration : IEntityTypeConfiguration<TripDayDestination>
{
    public void Configure(EntityTypeBuilder<TripDayDestination> builder)
    {
        builder.ToTable("trip_day_destinations");

        builder.HasKey(item => new { item.TripDayId, item.DestinationId });

        builder.Property(item => item.TripDayId).HasColumnName("trip_day_id");
        builder.Property(item => item.DestinationId).HasColumnName("destination_id");
        builder.Property(item => item.Position).HasColumnName("position").IsRequired();

        builder.HasOne(item => item.Destination)
            .WithMany()
            .HasForeignKey(item => item.DestinationId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
