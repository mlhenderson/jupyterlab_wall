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

  public toJSON(): AlertMessageJSON {
    return new AlertMessageJSON(
      this.alertType,
      this.message,
      this.priority,
      this.start.toISOString()
    );
  }
}

export class AlertMessageJSON {
  type: string;
  message: string;
  priority: number;
  start: string;

  public constructor(
    type: string,
    message: string,
    priority: number,
    start: string
  ) {
    this.type = type;
    this.message = message;
    this.priority = priority;
    this.start = start;
  }
}
