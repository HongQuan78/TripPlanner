namespace TripPlanner.Domain.Models;

public abstract class Destination
{
    public int Id { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public double Rating { get; private set; }
    public string? ExternalId { get; private set; }
    public abstract string Category { get; }

    protected Destination() { }

    protected Destination(string name, double rating, string? externalId = null)
    {
        Name = name;
        Rating = rating;
        ExternalId = externalId;
    }
}
