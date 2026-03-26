//! Migration: create secure_shares table.

use sea_orm_migration::prelude::*;

use super::m20260324_000001_create_users::Users;
use super::m20260324_000003_create_vault_items::VaultItems;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(SecureShares::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(SecureShares::Id).string_len(12).not_null().primary_key())
                    .col(ColumnDef::new(SecureShares::VaultItemId).uuid())
                    .col(ColumnDef::new(SecureShares::UserId).uuid().not_null())
                    .col(ColumnDef::new(SecureShares::EncryptedData).text().not_null())
                    .col(ColumnDef::new(SecureShares::MaxViews).integer())
                    .col(ColumnDef::new(SecureShares::CurrentViews).integer().not_null().default(0))
                    .col(ColumnDef::new(SecureShares::ExpiresAt).timestamp_with_time_zone())
                    .col(ColumnDef::new(SecureShares::CreatedAt).timestamp_with_time_zone().default(Expr::current_timestamp()))
                    .col(ColumnDef::new(SecureShares::AccessedAt).timestamp_with_time_zone())
                    .foreign_key(
                        ForeignKey::create()
                            .from(SecureShares::Table, SecureShares::VaultItemId)
                            .to(VaultItems::Table, VaultItems::Id),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .from(SecureShares::Table, SecureShares::UserId)
                            .to(Users::Table, Users::Id),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_table(Table::drop().table(SecureShares::Table).to_owned()).await
    }
}

#[derive(DeriveIden)]
pub enum SecureShares {
    Table,
    Id,
    VaultItemId,
    UserId,
    EncryptedData,
    MaxViews,
    CurrentViews,
    ExpiresAt,
    CreatedAt,
    AccessedAt,
}
