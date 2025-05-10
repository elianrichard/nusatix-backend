import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db'; // Instance Sequelize dari db.ts

interface EventAttributes {
  event_id: number;
  event_name: string;
  event_description: string | null;
  event_image_url: string | null;
  event_overall_start_date: Date | null;
  event_overall_end_date: Date | null;
  event_overall_start_time: string | null; // HH:MM
  event_overall_end_time: string | null;   // HH:MM
  venue_address: string | null;
  default_sol_price: number;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface EventCreationAttributes extends Optional<EventAttributes, 'event_id' | 'created_at' | 'updated_at' | 'event_description' | 'event_image_url' | 'event_overall_start_date' | 'event_overall_end_date' | 'event_overall_start_time' | 'event_overall_end_time' | 'venue_address' | 'is_active' | 'default_sol_price'> {}

class Event extends Model<EventAttributes, EventCreationAttributes> implements EventAttributes {
  public event_id!: number;
  public event_name!: string;
  public event_description!: string | null;
  public event_image_url!: string | null;
  public event_overall_start_date!: Date | null;
  public event_overall_end_date!: Date | null;
  public event_overall_start_time!: string | null;
  public event_overall_end_time!: string | null;
  public venue_address!: string | null;
  public default_sol_price!: number;
  public is_active!: boolean;

  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Event.init(
  {
    event_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    event_name: {
      type: new DataTypes.STRING(255),
      allowNull: false,
    },
    event_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    event_image_url: {
      type: new DataTypes.STRING(255),
      allowNull: true,
    },
    event_overall_start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    event_overall_end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    event_overall_start_time: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    event_overall_end_time: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    venue_address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    default_sol_price: {
      type: new DataTypes.DECIMAL(20, 8),
      allowNull: false,
      defaultValue: 0,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'events',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default Event;