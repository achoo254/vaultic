//! SeaORM database migrations for Vaultic.

pub use sea_orm_migration::prelude::*;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        // Migrations added in Phase 3
        vec![]
    }
}
