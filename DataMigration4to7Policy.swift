//
//  DataMigration4to7Policy.swift
//  SolPlayer
//
//  Created by Morioka Naoya on H28/07/03.
//  Copyright © 平成28年 Morioka Naoya. All rights reserved.
//

import Foundation
import CoreData

class DataMigration4to7Policy: NSEntityMigrationPolicy {

    /*
    init() {
        
    }
     */
    
    override func createDestinationInstancesForSourceInstance(sInstance: NSManagedObject, entityMapping mapping: NSEntityMapping, manager: NSMigrationManager) throws {
        let context: NSManagedObjectContext = manager.destinationContext
        let entityName: String = mapping.destinationEntityName!
        let dInstance: NSManagedObject = NSEntityDescription.insertNewObjectForEntityForName(entityName, inManagedObjectContext: context)
        
        /** PlaylistエンティティのidをStringに */
        
        let playListId = sInstance.valueForKey("id")
        
        if(playListId!.isKindOfClass(NSNumber)){
            dInstance.setValue("id", forKey: String(playListId))
        }

    }
}
