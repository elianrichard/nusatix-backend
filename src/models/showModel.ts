import { DataTypes, Model, Optional, ForeignKey } from 'sequelize';
import sequelize from '../db';
import Event from './eventModel';

export interface ShowAttributes {
  show_id: number;
  event_id: ForeignKey<Event['event_id']>;
  show_name: string | null;
  show_date: Date;
  show_start_time: string; // HH:MM
  show_end_time: string | null; // HH:MM
  sol_price: number | null;
  metadata_template_ipfs_cid: string | null;
  total_tickets: number;
  tickets_sold: number;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface ShowCreationAttributes extends Optional<ShowAttributes, 'show_id' | 'created_at' | 'updated_at' | 'show_name' | 'show_end_time' | 'sol_price' | 'metadata_template_ipfs_cid' | 'total_tickets' | 'tickets_sold' | 'is_active'> { }

class Show extends Model<ShowAttributes, ShowCreationAttributes> implements ShowAttributes {
  public show_id!: number;
  public event_id!: ForeignKey<Event['event_id']>;
  public show_name!: string | null;
  public show_date!: Date;
  public show_start_time!: string;
  public show_end_time!: string | null;
  public sol_price!: number | null;
  public metadata_template_ipfs_cid!: string | null;
  public total_tickets!: number;
  public tickets_sold!: number;
  public is_active!: boolean;

  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Show.init(
  {
    show_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    event_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Event,
        key: 'event_id',
      },
    },
    show_name: {
      type: new DataTypes.STRING(255),
      allowNull: true,
    },
    show_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    show_start_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    show_end_time: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    sol_price: {
      type: new DataTypes.DECIMAL(20, 8),
      allowNull: true,
    },
    metadata_template_ipfs_cid: {
      type: new DataTypes.STRING(255),
      allowNull: true,
    },
    total_tickets: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    tickets_sold: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'shows',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default Show;