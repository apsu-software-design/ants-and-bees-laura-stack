import {Insect, Bee, Ant, GrowerAnt, ThrowerAnt, EaterAnt, ScubaAnt, GuardAnt} from './ants';


/** Place Class manipulates any reference to the location of an ant or bee in the game.

*/
class Place {
  protected ant:Ant;
  protected guard:GuardAnt;
  protected bees:Bee[] = [];

  constructor(readonly name:string,
              protected readonly water = false,
              private exit?:Place, 
              private entrance?:Place) {}

  getExit():Place { return this.exit; }

  setEntrance(place:Place){ this.entrance = place; }

  isWater():boolean { return this.water; }
 /**Gets the ant that is in a particular spot. If it has a guard, it will get the guard. 
 @return the guard at a particular spot. If there is no guard, return the ant.

 */
  getAnt():Ant { 
    if(this.guard) 
      return this.guard;
    else 
      return this.ant;
  }

  getGuardedAnt():Ant {
    return this.ant;
  }

  getBees():Bee[] { return this.bees; }

/**Looks for the bee at the closest location of the player ant. 
*@param maxDistance is the maximum distance allowed in order for a bee to be considered the closest bee
@param minDistance is the minimum distance the bee has to be in order for it to be considered the closesr bee
@return the closest bee to the ant. If there is no closest bee, undefined will be returned, indicating there isn't one.
 */
  getClosestBee(maxDistance:number, minDistance:number = 0):Bee {
		let p:Place = this;
		for(let dist = 0; p!==undefined && dist <= maxDistance; dist++) { //for each place that is not undefinited & distance is less than the max, add 1 to distance
			if(dist >= minDistance && p.bees.length > 0) { //as long as the distance is <= minimum distance as the amount of bees at the place are >0
				return p.bees[0]; //return the first bee 
      }
			p = p.entrance; //place will be set to the entrance
		}
		return undefined; //return otherwise
  }

/**adds an ant to the existing colony
@param ant is the ant to be added to the colony
@return true or false based on the conditions
*/
  addAnt(ant:Ant):boolean {
    if(ant instanceof GuardAnt) { //if the ant is a guard ant
      if(this.guard === undefined){ //if there is no guard
        this.guard = ant; //this ant will become the guard
        this.guard.setPlace(this); //set the guard to the place
        return true;
      }
    }
    else 
      if(this.ant === undefined) { //if the ant is not a guard ant
        this.ant = ant; //set the ant to this place
        this.ant.setPlace(this);
        return true;
      }
    return false; //if no condition follows
  }

/**removes an ant from the colony
*@return if there is a guard, remove It. If no guard, remove ant
*/
  removeAnt():Ant {
    if(this.guard !== undefined){ //if there is a guard
      let guard = this.guard; //remove the guard 
      this.guard = undefined;
      return guard;
    }
    else {
      let ant = this.ant; //if no guard, remove the ant
      this.ant = undefined;
      return ant;
    }
  }

/**Adds a bee to a particular location
*@param bee is a Bee object that will be placed in a location when it is called
*/ 
  addBee(bee:Bee):void {
    this.bees.push(bee);
    bee.setPlace(this);
  }
 
/**Removes a bee from a particular location
@param bee is a Bee object that will be removed from a location when this function is called
*/
  removeBee(bee:Bee):void {
    var index = this.bees.indexOf(bee);
    if(index >= 0){
      this.bees.splice(index,1);
      bee.setPlace(undefined);
    }
  }

/**Will remove all bees that have been placed in the game

*/
  removeAllBees():void {
    this.bees.forEach((bee) => bee.setPlace(undefined) );
    this.bees = [];
  }

/**Will add a bee to the exit
*/
  exitBee(bee:Bee):void {
    this.removeBee(bee);
    this.exit.addBee(bee);  
  }

/** Will remove an insect whether it is an ant or a bee

*/

  removeInsect(insect:Insect) {
    if(insect instanceof Ant){
      this.removeAnt();
    }
    else if(insect instanceof Bee){
      this.removeBee(insect);
    }
  }

/**Reflects what should happen depending on the place. If the location is water and has a guard, it will be removed.
* If the ant at the location is not a ScubaAnt, it will be removed.
*/
  act() {
    if(this.water){
      if(this.guard){
        this.removeAnt();
      }
      if(!(this.ant instanceof ScubaAnt)){
        this.removeAnt();
      }
    }
  }
}
/**constructs the armor and damage a bee deals. Takes care of waves of attacks and full on invasions of bees to the ant colony.
*/

class Hive extends Place {
  private waves:{[index:number]:Bee[]} = {}

  constructor(private beeArmor:number, private beeDamage:number){
    super('Hive');
  }
  /**adds a wave of bees from the hive as an attack
  @param attackTurn is when the attack will take Place
  @param numBees are the number of bees to be released from the hive for the wave
  @return this 
  */
  addWave(attackTurn:number, numBees:number):Hive {
    let wave:Bee[] = []; //new array of Bees 
    for(let i=0; i<numBees; i++) { //for all the bees 
      let bee = new Bee(this.beeArmor, this.beeDamage, this); //new bee object
      this.addBee(bee); //add the bee 
      wave.push(bee); //push the bee to the wave
    }
    this.waves[attackTurn] = wave; //at the attack turn, add the wave 
    return this;
  }
  
  /** All the bees in the hive will invade the ant colony
  *@param colony is the AntColony that will be attacked
  *@param currentTurn is the turn we are currently on in the game
  *@return the Bee array of waves that the current turn is at 
  */
  invade(colony:AntColony, currentTurn:number): Bee[]{
    if(this.waves[currentTurn] !== undefined) { //if the waves currentTurn is not undefined
      this.waves[currentTurn].forEach((bee) => { //for each bee, make their wave the currentTurn
        this.removeBee(bee); //remove bee
        let entrances:Place[] = colony.getEntrances(); //make the place, the colony entrance
        let randEntrance:number = Math.floor(Math.random()*entrances.length); //random entrance created for each bee
        entrances[randEntrance].addBee(bee); //add bee at the random entrance 
      });
      return this.waves[currentTurn]; //enter at the appropriate turn from different entrances 
    }
    else{
      return [];
    }    
  }
}
/**Controls levels of health of the ants as well as the boosts.
*/

class AntColony {
  private food:number;
  private places:Place[][] = [];
  private beeEntrances:Place[] = [];
  private queenPlace:Place = new Place('Ant Queen');
  private boosts:{[index:string]:number} = {'FlyingLeaf':1,'StickyLeaf':1,'IcyLeaf':1,'BugSpray':0}


  /** Complex constructor for the AntColony object
  @param startingFood is the amount of food the colony will start out with
  @param numTunnels is the amount of tunnels in the colony
  @param tunnelLength is how long the tunnel is
  @param moatFrequnecy is automatically set to 0
  */
  constructor(startingFood:number, numTunnels:number, tunnelLength:number, moatFrequency=0){
    this.food = startingFood;

    let prev:Place;
		for(let tunnel=0; tunnel < numTunnels; tunnel++)
		{
			let curr:Place = this.queenPlace;
      this.places[tunnel] = [];
			for(let step=0; step < tunnelLength; step++)
			{
        let typeName = 'tunnel';
        if(moatFrequency !== 0 && (step+1)%moatFrequency === 0){
          typeName = 'water';
				}
				
				prev = curr;
        let locationId:string = tunnel+','+step;
        curr = new Place(typeName+'['+locationId+']', typeName=='water', prev);
        prev.setEntrance(curr);
				this.places[tunnel][step] = curr;
			}
			this.beeEntrances.push(curr);
		}
  }

  getFood():number { return this.food; }

  increaseFood(amount:number):void { this.food += amount; }

  getPlaces():Place[][] { return this.places; }

  getEntrances():Place[] { return this.beeEntrances; }

  getQueenPlace():Place { return this.queenPlace; }

  queenHasBees():boolean { return this.queenPlace.getBees().length > 0; }

  getBoosts():{[index:string]:number} { return this.boosts; }


  /** adds a boost when required
  */
  addBoost(boost:string){
    if(this.boosts[boost] === undefined){
      this.boosts[boost] = 0;
    }
    this.boosts[boost] = this.boosts[boost]+1;
    console.log('Found a '+boost+'!');
  }


  /** will deploy an ant to a particular Place. 

  */
  deployAnt(ant:Ant, place:Place):string {
    if(this.food >= ant.getFoodCost()){
      let success = place.addAnt(ant);
      if(success){
        this.food -= ant.getFoodCost();
        return undefined;
      }
      return 'tunnel already occupied';
    }
    return 'not enough food';
  }

  removeAnt(place:Place){
    place.removeAnt();
  }

  /** will give a particular ant in the colony a boost under certain conditions
  */
  applyBoost(boost:string, place:Place):string {
    if(this.boosts[boost] === undefined || this.boosts[boost] < 1) {
      return 'no such boost';
    }
    let ant:Ant = place.getAnt();
    if(!ant) {
      return 'no Ant at location' 
    }
    ant.setBoost(boost);
    return undefined;
  }

/** if there is a GuardAnt in the colony, it will act like a guardAnt. If there is none, it will act like a regular ant.
*/
  antsAct() {
    this.getAllAnts().forEach((ant) => {
      if(ant instanceof GuardAnt) {
        let guarded = ant.getGuarded();
        if(guarded)
          guarded.act(this);
      }
      ant.act(this);
    });    
  }

  /** all bees will act 
  */
  beesAct() {
    this.getAllBees().forEach((bee) => {
      bee.act();
    });
  }



  /** every place will act a particular way
  */
  placesAct() {
    for(let i=0; i<this.places.length; i++) {
      for(let j=0; j<this.places[i].length; j++) {
        this.places[i][j].act();
      }
    }    
  }

/** traverses through all the ants on the gameboard and adds it to the ants array
*@return all the ants that are on the gameboard
*/

  getAllAnts():Ant[] {
    let ants = [];
    for(let i=0; i<this.places.length; i++) {
      for(let j=0; j<this.places[i].length; j++) {
        if(this.places[i][j].getAnt() !== undefined) {
          ants.push(this.places[i][j].getAnt());
        }
      }
    }
    return ants;
  }

/** Will traverse the gameboard and will add all the bees on the gameboard to the bees array
*@return the final array of bees that were out on the gameboard
*/
  getAllBees():Bee[] {
    var bees = [];
    for(var i=0; i<this.places.length; i++){
      for(var j=0; j<this.places[i].length; j++){
        bees = bees.concat(this.places[i][j].getBees());
      }
    }
    return bees;
  }
}


/**Controls the basic skeleton of the game such as turns, whether or not a game has been won, and the deployment of ants.
*/
class AntGame {
  private turn:number = 0;
  constructor(private colony:AntColony, private hive:Hive){}

  takeTurn() {
    console.log('');
    this.colony.antsAct();
    this.colony.beesAct();
    this.colony.placesAct();
    this.hive.invade(this.colony, this.turn);
    this.turn++;
    console.log('');
  }

  getTurn() { return this.turn; }


  /** indicates whether or not the game has been won. It has been won if there are no bees in the colony or the hive.
  *@return true or false based on if the game has been won. 
  */
  gameIsWon():boolean|undefined {
    if(this.colony.queenHasBees()){
      return false;
    }
    else if(this.colony.getAllBees().length + this.hive.getBees().length === 0) {
      return true;
    }   
    return undefined;
  }

  /**will deploy a certain type of ant to partcular coordinates on the gameboard.
  @param antType is the type of ant to be entered to be deployed.
  @param placeCoordinates are the coordinates on the gameboard in which the ant will be deployed
  @return an unknown ant type if the one entered is invalid. will return an illegal location if the coordinates entered do not exist on board.
  */
  deployAnt(antType:string, placeCoordinates:string):string {
    let ant;
    switch(antType.toLowerCase()) {
      case "grower":
        ant = new GrowerAnt(); break;
      case "thrower":
        ant = new ThrowerAnt(); break;
      case "eater":
        ant = new EaterAnt(); break;
      case "scuba":
        ant = new ScubaAnt(); break;
      case "guard":
        ant = new GuardAnt(); break;
      default:
        return 'unknown ant type';
    }

    try {
      let coords = placeCoordinates.split(',');
      let place:Place = this.colony.getPlaces()[coords[0]][coords[1]];
      return this.colony.deployAnt(ant, place);
    } catch(e) {
      return 'illegal location';
    }
  }


  /**Removes an ant from the entered coordinates. there will be an catch exception if the location entered is not on the gameboard.
  @param placeCoordinates are the coordinates to be entered in which the ant should be removed
  @return will be of strng type if the coordinates entered are not on the gameboard. Otherwise, the function will simply return if the action is completed.
  */
  removeAnt(placeCoordinates:string):string {
    try {
      let coords = placeCoordinates.split(',');
      let place:Place = this.colony.getPlaces()[coords[0]][coords[1]];
      place.removeAnt();
      return undefined;
    }catch(e){
      return 'illegal location';
    }    
  }

  /**will apply a boost to an ant colony that are at an entered location
  *@param boostType is the kind of boost to be applied to the colony
  *@param placeCoordinates is the coordinates in which the boost should be applied to the boost colony
  *@return if the coordinates entered are illegal, a string type will be returned stating the the location is illegal
  */ 
  boostAnt(boostType:string, placeCoordinates:string):string {
    try {
      let coords = placeCoordinates.split(',');
      let place:Place = this.colony.getPlaces()[coords[0]][coords[1]];
      return this.colony.applyBoost(boostType,place);
    }catch(e){
      return 'illegal location';
    }    
  }

  getPlaces():Place[][] { return this.colony.getPlaces(); }
  getFood():number { return this.colony.getFood(); }
  getHiveBeesCount():number { return this.hive.getBees().length; }

 /* gets the boost names of a colony
 */
  getBoostNames():string[] { 
    let boosts = this.colony.getBoosts();
    return Object.keys(boosts).filter((boost:string) => {
      return boosts[boost] > 0;
    }); 
  }
}

export { AntGame, Place, Hive, AntColony }