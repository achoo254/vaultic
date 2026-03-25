//! SeaORM entity: secure_shares table.

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "secure_shares")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_type = "String(StringLen::N(12))")]
    pub id: String,
    pub vault_item_id: Option<Uuid>,
    pub user_id: Uuid,
    pub encrypted_data: String,
    pub max_views: Option<i32>,
    pub current_views: i32,
    pub expires_at: Option<DateTimeWithTimeZone>,
    pub created_at: Option<DateTimeWithTimeZone>,
    pub accessed_at: Option<DateTimeWithTimeZone>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::UserId",
        to = "super::user::Column::Id"
    )]
    User,
    #[sea_orm(
        belongs_to = "super::vault_item::Entity",
        from = "Column::VaultItemId",
        to = "super::vault_item::Column::Id"
    )]
    VaultItem,
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::User.def()
    }
}

impl Related<super::vault_item::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::VaultItem.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
