//! SeaORM database migrations for Vaultic.

pub use sea_orm_migration::prelude::*;

mod m20260324_000001_create_users;
mod m20260324_000002_create_folders;
mod m20260324_000003_create_vault_items;
mod m20260324_000004_create_secure_shares;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20260324_000001_create_users::Migration),
            Box::new(m20260324_000002_create_folders::Migration),
            Box::new(m20260324_000003_create_vault_items::Migration),
            Box::new(m20260324_000004_create_secure_shares::Migration),
        ]
    }
}
