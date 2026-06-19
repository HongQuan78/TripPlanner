namespace TripPlanner.Domain.Models;

public class Restaurant : Destination
{
    public string CuisineType { get; private set; } = string.Empty;
    public bool IsHalalFriendly { get; private set; }
    public override string Category => "Restaurant";

    private Restaurant() { }

    public Restaurant(string name, double rating, string cuisineType, bool isHalalFriendly) : base(name, rating)
    {
        CuisineType = cuisineType;
        IsHalalFriendly = isHalalFriendly;
    }
}
