//! Migration: create vault_items table for sync relay.

use sea_orm_migration::prelude::*;

use super::m20260324_000001_create_users::Users;
use super::m20260324_000002_create_folders::Folders;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(VaultItems::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(VaultItems::Id).uuid().not_null().primary_key())
                    .col(ColumnDef::new(VaultItems::UserId).uuid().not_null())
                    .col(ColumnDef::new(VaultItems::FolderId).uuid())
                    .col(ColumnDef::new(VaultItems::ItemType).small_integer().not_null().default(1))
                    .col(ColumnDef::new(VaultItems::EncryptedData).text().not_null())
                    .col(ColumnDef::new(VaultItems::DeviceId).string_len(36).not_null())
                    .col(ColumnDef::new(VaultItems::Version).integer().not_null().default(1))
                    .col(ColumnDef::new(VaultItems::CreatedAt).timestamp_with_time_zone().default(Expr::current_timestamp()))
                    .col(ColumnDef::new(VaultItems::UpdatedAt).timestamp_with_time_zone().default(Expr::current_timestamp()))
                    .col(ColumnDef::new(VaultItems::DeletedAt).timestamp_with_time_zone())
                    .foreign_key(
                        ForeignKey::create()
                            .from(VaultItems::Table, VaultItems::UserId)
                            .to(Users::Table, Users::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .from(VaultItems::Table, VaultItems::FolderId)
                            .to(Folders::Table, Folders::Id),
                    )
                    .to_owned(),
            )
            .await?;

        // Index for sync pull queries
        manager
            .create_index(
                Index::create()
                    .name("idx_vault_items_user_updated")
                    .table(VaultItems::Table)
                    .col(VaultItems::UserId)
                    .col(VaultItems::UpdatedAt)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_vault_items_device")
                    .table(VaultItems::Table)
                    .col(VaultItems::UserId)
                    .col(VaultItems::DeviceId)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_table(Table::drop().table(VaultItems::Table).to_owned()).await
    }
}

#[derive(DeriveIden)]
pub enum VaultItems {
    Table,
    Id,
    UserId,
    FolderId,
    ItemType,
    EncryptedData,
    DeviceId,
    Version,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}
