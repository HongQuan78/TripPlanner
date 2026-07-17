FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY TripPlanner.slnx ./
COPY TripPlanner.API/TripPlanner.API.csproj TripPlanner.API/
COPY TripPlanner.Application/TripPlanner.Application.csproj TripPlanner.Application/
COPY TripPlanner.Domain/TripPlanner.Domain.csproj TripPlanner.Domain/
COPY TripPlanner.Infrastructure/TripPlanner.Infrastructure.csproj TripPlanner.Infrastructure/
COPY TripPlanner.Tests/TripPlanner.Tests.csproj TripPlanner.Tests/
RUN dotnet restore TripPlanner.API/TripPlanner.API.csproj

COPY . ./
RUN dotnet publish TripPlanner.API/TripPlanner.API.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:8080

COPY --from=build /app/publish ./
EXPOSE 8080

USER app
ENTRYPOINT ["dotnet", "TripPlanner.API.dll"]
