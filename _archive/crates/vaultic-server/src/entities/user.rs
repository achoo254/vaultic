//! SeaORM entity: users table.

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "users")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    #[sea_orm(unique)]
    pub email: String,
    pub auth_hash: String,
    pub encrypted_symmetric_key: Option<String>,
    #[sea_orm(column_type = "JsonBinary")]
    pub argon2_params: Json,
    pub created_at: Option<DateTimeWithTimeZone>,
    pub updated_at: Option<DateTimeWithTimeZone>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::folder::Entity")]
    Folders,
    #[sea_orm(has_many = "super::vault_item::Entity")]
    VaultItems,
    #[sea_orm(has_many = "super::secure_share::Entity")]
    SecureShares,
}

impl Related<super::folder::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Folders.def()
    }
}

impl Related<super::vault_item::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::VaultItems.def()
    }
}

impl Related<super::secure_share::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::SecureShares.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
