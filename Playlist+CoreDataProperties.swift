//
//  Playlist+CoreDataProperties.swift
//  SolPlayer
//
//  Created by Morioka Naoya on H28/06/24.
//  Copyright © 平成28年 Morioka Naoya. All rights reserved.
//
//  Choose "Create NSManagedObject Subclass…" from the Core Data editor menu
//  to delete and recreate this implementation file for your updated model.
//

import Foundation
import CoreData

extension Playlist {

    @NSManaged var id: NSNumber?
    @NSManaged var name: String?
    @NSManaged var relationship: Song?

}
