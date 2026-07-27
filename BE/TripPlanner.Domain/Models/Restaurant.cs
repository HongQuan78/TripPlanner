namespace TripPlanner.Domain.Models;

public class Restaurant : Destination
{
    public override string Category => "Restaurant";

    private Restaurant() { }

    public Restaurant(string name, double rating, string? externalId = null) : base(name, rating, externalId)
    {
    }
}
