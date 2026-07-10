namespace TripPlanner.API.Extensions;

public static class CorsExtension
    {
        public static IServiceCollection AddCustomCors(this IServiceCollection services, string policyName)
        {
            services.AddCors(options =>
            {
                options.AddPolicy(policyName, 
                policy => 
                    {
                        policy
                            .SetIsOriginAllowed
                            (
                                origin => new Uri(origin).IsLoopback
                            )
                            .AllowAnyHeader()
                            .AllowAnyMethod();
                    }
                );
            });

            return services;
        }
    }