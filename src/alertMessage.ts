export class AlertMessage {
  protected alertType: string;
  protected message: string;
  protected priority: number;
  protected start: Date;
  protected alertID: string;

  public constructor(
    alert: string,
    msg: string,
    priority: number,
    start: string
  ) {
    this.alertType = alert;
    this.message = msg;
    this.priority = priority;
    this.start = new Date(start);
    this.alertID = this.alertType + '_' + this.start.toISOString();
  }

  public getType(): string {
    return this.alertType;
  }

  public getMessage(): string {
    return this.message;
  }

  public getPriority(): number {
    return this.priority;
  }

  public getStartDateTime(): Date {
    return this.start;
  }

  public getID(): string {
    return this.alertID;
  }

  public toJSONString(): string {
    return JSON.stringify({
      type: this.alertType,
      message: this.message,
      priority: this.priority,
      start: this.start.toISOString()
    });
  }

  public toJSON(): AlertMessageJSON {
    return {
      type: this.alertType,
      message: this.message,
      priority: this.priority,
      start: this.start.toISOString()
    };
  }
}

export class AlertMessageJSON {
  type: string;
  message: string;
  priority: number;
  start: string;
}
