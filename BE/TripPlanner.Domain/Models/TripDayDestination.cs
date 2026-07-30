namespace TripPlanner.Domain.Models;

public class TripDayDestination
{
    public int TripDayId { get; private set; }
    public int DestinationId { get; private set; }
    public Destination Destination { get; private set; } = null!;
    public int Position { get; private set; }

    private TripDayDestination() { }

    public TripDayDestination(Destination destination, int position)
    {
        Destination = destination;
        Position = position;
    }

    public void SetPosition(int position)
    {
        Position = position;
    }
}
