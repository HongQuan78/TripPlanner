using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TripPlanner.Domain.Models;

namespace TripPlanner.Infrastructure.Data.Configurations;

internal sealed class DestinationConfiguration : IEntityTypeConfiguration<Destination>
{
    public void Configure(EntityTypeBuilder<Destination> builder)
    {
        builder.ToTable("destinations");

        builder.HasKey(d => d.Id);
        builder.Property(d => d.Id).UseIdentityAlwaysColumn();
        builder.Property(d => d.Name).IsRequired().HasMaxLength(200);
        builder.Property(d => d.Rating).IsRequired();

        // Use a shadow property as the TPH discriminator so the computed Category property is unaffected.
        builder.HasDiscriminator<string>("destination_type")
            .HasValue<Landmark>("Landmark")
            .HasValue<Restaurant>("Restaurant");
    }
}
