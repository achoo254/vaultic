//! Migration: create folders table.

use sea_orm_migration::prelude::*;

use super::m20260324_000001_create_users::Users;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Folders::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(Folders::Id).uuid().not_null().primary_key().default(Expr::cust("gen_random_uuid()")))
                    .col(ColumnDef::new(Folders::UserId).uuid().not_null())
                    .col(ColumnDef::new(Folders::EncryptedName).text().not_null())
                    .col(ColumnDef::new(Folders::ParentId).uuid())
                    .col(ColumnDef::new(Folders::CreatedAt).timestamp_with_time_zone().default(Expr::current_timestamp()))
                    .col(ColumnDef::new(Folders::UpdatedAt).timestamp_with_time_zone().default(Expr::current_timestamp()))
                    .col(ColumnDef::new(Folders::DeletedAt).timestamp_with_time_zone())
                    .foreign_key(
                        ForeignKey::create()
                            .from(Folders::Table, Folders::UserId)
                            .to(Users::Table, Users::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .from(Folders::Table, Folders::ParentId)
                            .to(Folders::Table, Folders::Id),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_table(Table::drop().table(Folders::Table).to_owned()).await
    }
}

#[derive(DeriveIden)]
pub enum Folders {
    Table,
    Id,
    UserId,
    EncryptedName,
    ParentId,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}
