using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripPlanner.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddResendCooldownAndUniqueTokenIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_users_VerificationTokenHash",
                table: "users");

            migrationBuilder.AddColumn<DateTime>(
                name: "LastVerificationEmailSentAt",
                table: "users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_VerificationTokenHash",
                table: "users",
                column: "VerificationTokenHash",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_users_VerificationTokenHash",
                table: "users");

            migrationBuilder.DropColumn(
                name: "LastVerificationEmailSentAt",
                table: "users");

            migrationBuilder.CreateIndex(
                name: "IX_users_VerificationTokenHash",
                table: "users",
                column: "VerificationTokenHash");
        }
    }
}
