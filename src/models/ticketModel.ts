import { DataTypes, Model, Optional, ForeignKey } from 'sequelize';
import sequelize from '../db';
import Show from './showModel';

interface TicketAttributes {
  ticket_id: number;
  show_id: ForeignKey<Show['show_id']>;
  owner_wallet_address: string;
  nft_mint_address: string;
  nft_metadata_url: string;
  nft_name: string | null;
  nft_image_url: string | null;
  purchase_price_sol: number | null;
  purchase_price_idr: number | null;
  seat_info: string | null;
  is_checked_in: boolean;
  purchased_at?: Date;
}

interface TicketCreationAttributes extends Optional<TicketAttributes, 'ticket_id' | 'purchased_at' | 'purchase_price_sol' | 'purchase_price_idr' | 'seat_info' | 'is_checked_in' | 'nft_name' | 'nft_image_url'> { }

class Ticket extends Model<TicketAttributes, TicketCreationAttributes> implements TicketAttributes {
  public ticket_id!: number;
  public show_id!: ForeignKey<Show['show_id']>;
  public owner_wallet_address!: string;
  public nft_mint_address!: string;
  public nft_metadata_url!: string;
  public nft_name!: string | null;
  public nft_image_url!: string | null;
  public purchase_price_sol!: number | null;
  public purchase_price_idr!: number | null;
  public seat_info!: string | null;
  public is_checked_in!: boolean;

  public readonly purchased_at!: Date;
}

Ticket.init(
  {
    ticket_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    show_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Show,
        key: 'show_id',
      },
    },
    owner_wallet_address: {
      type: new DataTypes.STRING(255),
      allowNull: false,
    },
    nft_mint_address: {
      type: new DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    nft_metadata_url: {
      type: new DataTypes.STRING(255),
      allowNull: false,
    },
    nft_name: {
      type: new DataTypes.STRING(255),
      allowNull: true,
    },
    nft_image_url: {
      type: new DataTypes.STRING(255),
      allowNull: true,
    },
    purchase_price_sol: {
      type: new DataTypes.DECIMAL(20, 8),
      allowNull: true,
    },
    purchase_price_idr: {
      type: new DataTypes.DECIMAL(15, 2),
      allowNull: true,
    },
    seat_info: {
      type: new DataTypes.STRING(100),
      allowNull: true,
    },
    is_checked_in: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    purchased_at: {
      type: DataTypes.DATE,
    }
  },
  {
    sequelize,
    tableName: 'tickets',
    timestamps: true,
    createdAt: 'purchased_at',
    updatedAt: false,
  }
);

export default Ticket;