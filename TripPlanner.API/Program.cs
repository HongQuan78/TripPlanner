using TripPlanner.API.Extensions;
using TripPlanner.API.Middleware;
const string PolicyName = "AllowLocalhost";
var builder = WebApplication.CreateBuilder(args);

builder.Services
.AddApplicationServices()
.AddCustomCors(PolicyName)
.AddCustomSwagger();

builder.Services.AddOpenApi();

var app = builder.Build();

app.UseExceptionHandler();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{   
    app.UseCustomSwagger();
}
app.UseMiddleware<LoggingMiddleware>();
app.AddRoute();
app.UseCors(PolicyName);
app.UseResponseCompression();
app.UseHttpsRedirection();

app.Run();
